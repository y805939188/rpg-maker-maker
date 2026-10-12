import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { Persistence, backup, restore, verifyBackup } from '@tileset/persistence';
import {
  setup,
  context,
  evidence,
  PROFILE,
  pairOperations,
  fragmentsFor,
  databaseUrl,
  pgBin,
  runRoot,
  snapshot,
} from './helpers.js';
import { runProcess, encodePrepared } from './process-helper.js';
import { MockProvider, Executor, Archiver } from '@tileset/local-executor';
import { freezeTaskSnapshot } from '@tileset/ai-gateway';

describe('real PostgreSQL + immutable files publication', () => {
  it('retains pre-migration minimal Project and enforces immutable revision history', async () => {
    const s = await setup();
    try {
      const marker = resolve('.local/step06/pre-migration-project.json');
      try {
        const old = JSON.parse(await readFile(marker, 'utf8'));
        const row = await s.store.db.project.findUniqueOrThrow({ where: { id: old.id } });
        expect(row.name).toBe(old.name);
        expect(row.createdAt.toISOString()).toBe(old.createdAt);
        await evidence('migration-preservation', {
          id: row.id,
          name: row.name,
          createdAt: row.createdAt,
          migration: 'additive-no-reset',
        });
      } catch (e) {
        if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT')) throw e;
      }
      const r = await s.store.db.assetRevision.findFirstOrThrow({
        where: { projectId: s.project.id },
      });
      await expect(
        s.store.db.assetRevision.update({
          where: { id: r.id },
          data: { contentHash: 'c'.repeat(64) },
        }),
      ).rejects.toThrow();
      const replay = await s.store.loadArchives(s.project.id);
      expect(replay.records).toHaveLength(2);
    } finally {
      await s.store.close();
    }
  });
  it('file-write and DB-commit failures preserve prior success and leave locatable orphans', async () => {
    let fail = '';
    const hook = async (point: string) => {
      if (point === fail) throw Error('injected-' + point);
    };
    const s = await setup(hook);
    try {
      const first = await s.store.prepareBuild(
        s.project.id,
        s.pack.id,
        s.adopted.id,
        s.operations,
        context,
      );
      await s.store.publish(first);
      const next = await s.store.prepareBuild(s.project.id, s.pack.id, s.adopted.id, [], context);
      for (const point of [
        'build-file-write',
        'build-file-partial',
        'files-durable',
        'db-transaction',
      ]) {
        fail = point;
        await expect(s.store.publish(next)).rejects.toThrow('injected');
        expect(
          (await s.store.db.project.findUniqueOrThrow({ where: { id: s.project.id } }))
            .successfulBuildId,
        ).toBe(first.id);
        expect(await s.store.db.build.findUnique({ where: { id: next.id } })).toBeNull();
      }
      fail = '';
      // Real PostgreSQL deferred trigger fails at COMMIT, after durable files and all registration SQL.
      const rejectName = 'step06_reject_' + s.project.id.replaceAll('-', '');
      let functionOwned = false,
        triggerOwned = false;
      try {
        await s.store.db.$executeRawUnsafe(
          `CREATE FUNCTION "${rejectName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'STEP06_DEFERRED_COMMIT_REJECTION'; END $$`,
        );
        functionOwned = true;
        await s.store.db.$executeRawUnsafe(
          `CREATE CONSTRAINT TRIGGER "${rejectName}" AFTER INSERT ON "Build" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.id = '${next.id}') EXECUTE FUNCTION "${rejectName}"()`,
        );
        triggerOwned = true;
        await expect(s.store.publish(next)).rejects.toThrow('STEP06_DEFERRED_COMMIT_REJECTION');
        expect(
          (await s.store.db.project.findUniqueOrThrow({ where: { id: s.project.id } }))
            .successfulBuildId,
        ).toBe(first.id);
        expect(await s.store.db.build.findUnique({ where: { id: next.id } })).toBeNull();
      } finally {
        if (triggerOwned)
          await s.store.db.$executeRawUnsafe(`DROP TRIGGER "${rejectName}" ON "Build"`);
        if (functionOwned) await s.store.db.$executeRawUnsafe(`DROP FUNCTION "${rejectName}"()`);
      }
      const recovered = await s.store.publish(next);
      expect(recovered.publication).toBe('ADOPTED');
      await s.store.publish(next);
      expect(await s.store.db.build.count({ where: { id: next.id } })).toBe(1);
      const inventory = await s.store.storage.inventory();
      expect(inventory.stages.length).toBeGreaterThan(0);
      await evidence('failures-and-recovery', {
        points: [
          'build-file-write',
          'build-file-partial',
          'files-durable',
          'db-transaction',
          'POSTGRES_DEFERRED_COMMIT_REJECTION',
        ],
        inventory,
        first: first.id,
        recovered: next.id,
      });
    } finally {
      await s.store.close();
    }
  });
  it('two reverse completions and same old Pack slot claim use CAS; late output is history', async () => {
    const s = await setup();
    try {
      const old = await s.store.prepareBuild(
        s.project.id,
        s.pack.id,
        s.adopted.id,
        s.operations,
        context,
      );
      const adopted2 = await s.store.adopt(s.project.id, 1, s.b.built.ir.dependencies);
      const newer = await s.store.prepareBuild(
        s.project.id,
        s.pack.id,
        adopted2.id,
        pairOperations('b', 1, fragmentsFor(s.b)),
        context,
      );
      expect((await s.store.publish(newer)).publication).toBe('ADOPTED');
      expect((await s.store.publish(old)).publication).toBe('HISTORICAL');
      expect(
        (await s.store.db.pack.findUniqueOrThrow({ where: { id: s.pack.id } })).currentBuildId,
      ).toBe(newer.id);
      const left = await s.store.prepareBuild(s.project.id, s.pack.id, adopted2.id, [], {
          ...context,
          commit: 'c'.repeat(40),
        }),
        right = await s.store.prepareBuild(s.project.id, s.pack.id, adopted2.id, [], {
          ...context,
          commit: 'd'.repeat(40),
        });
      const results = await Promise.all([s.store.publish(left), s.store.publish(right)]);
      expect(results.map((r) => r.publication).sort()).toEqual(['ADOPTED', 'HISTORICAL']);
      expect(await s.store.db.packVersion.count({ where: { packId: s.pack.id } })).toBe(2);
      const combined = await s.store.adopt(s.project.id, 2, [
        ...s.a.built.ir.dependencies,
        ...s.b.built.ir.dependencies,
      ]);
      const slots = await s.store.createPack(s.project.id, 'same-old-slot');
      const claimA = await s.store.prepareBuild(
          s.project.id,
          slots.id,
          combined.id,
          s.operations,
          context,
        ),
        claimB = await s.store.prepareBuild(
          s.project.id,
          slots.id,
          combined.id,
          pairOperations('b', 1, fragmentsFor(s.b)),
          context,
        );
      const claims = await Promise.all([s.store.publish(claimA), s.store.publish(claimB)]);
      expect(claims.map((c) => c.publication).sort()).toEqual(['ADOPTED', 'HISTORICAL']);
      expect(await s.store.db.packVersion.count({ where: { packId: slots.id } })).toBe(1);
      await evidence('race', {
        claims: claims.map((c) => ({ id: c.id, publication: c.publication })),
        old: old.id,
        newer: newer.id,
        results: results.map((r) => ({ id: r.id, publication: r.publication })),
      });
    } finally {
      await s.store.close();
    }
  });
  it('actual SIGKILL before/after DB commit is recoverable from fresh production-JS processes', async () => {
    const s = await setup();
    try {
      const first = await s.store.prepareBuild(
        s.project.id,
        s.pack.id,
        s.adopted.id,
        s.operations,
        context,
      );
      const partial = await runProcess(
        {
          mode: 'publish',
          root: s.store.storage.root,
          prepared: encodePrepared(first),
          stopAt: 'build-file-partial',
        },
        'build-file-partial',
      );
      expect(partial.signal).toBe('SIGKILL');
      expect(await s.store.db.build.findUnique({ where: { id: first.id } })).toBeNull();
      const before = await runProcess(
        {
          mode: 'publish',
          root: s.store.storage.root,
          prepared: encodePrepared(first),
          stopAt: 'before-db-commit',
        },
        'before-db-commit',
      );
      expect(before.signal).toBe('SIGKILL');
      expect(await s.store.db.build.findUnique({ where: { id: first.id } })).toBeNull();
      const after = await runProcess(
        {
          mode: 'publish',
          root: s.store.storage.root,
          prepared: encodePrepared(first),
          stopAt: 'after-db-commit',
        },
        'after-db-commit',
      );
      expect(after.signal).toBe('SIGKILL');
      expect(
        (await s.store.db.project.findUniqueOrThrow({ where: { id: s.project.id } }))
          .successfulBuildId,
      ).toBe(first.id);
      const restart = await runProcess({
        mode: 'publish',
        root: s.store.storage.root,
        prepared: encodePrepared(first),
      });
      expect(restart.code).toBe(0);
      expect(await s.store.db.build.count({ where: { id: first.id } })).toBe(1);
      await evidence('publication-process-kill', {
        partial,
        before,
        after,
        restart,
        build: first.id,
      });
    } finally {
      await s.store.close();
    }
  });
  it('retired dependencies, consistent DB+files backup, empty-environment restore and actual rebuild', async () => {
    const fixtureName = 'tileset_backup_fixture_' + randomUUID().replaceAll('-', ''),
      fixtureUrl = new URL(databaseUrl!);
    fixtureUrl.pathname = '/' + fixtureName;
    const owner = new pg.Client({ connectionString: databaseUrl! });
    await owner.connect();
    try {
      await owner.query(`CREATE DATABASE "${fixtureName}"`);
    } finally {
      await owner.end();
    }
    const migrated = spawnSync(
      'pnpm',
      [
        '--filter',
        '@tileset/api',
        'exec',
        'prisma',
        'migrate',
        'deploy',
        '--schema',
        'prisma/schema.prisma',
      ],
      { env: { ...process.env, DATABASE_URL: fixtureUrl.href }, encoding: 'utf8' },
    );
    expect(migrated.status).toBe(0);
    const s = await setup(undefined, {
      url: fixtureUrl.href,
      assetRoot: resolve(runRoot, fixtureName, 'assets'),
    });
    let restored: Persistence | undefined;
    try {
      const first = await s.store.prepareBuild(
        s.project.id,
        s.pack.id,
        s.adopted.id,
        s.operations,
        context,
      );
      await s.store.publish(first);
      const retired = await s.store.prepareBuild(
        s.project.id,
        s.pack.id,
        s.adopted.id,
        [
          { operation: 'retire', logicalId: 'a-ground' },
          { operation: 'retire', logicalId: 'a-water' },
        ],
        context,
      );
      await s.store.publish(retired);
      const provider = new MockProvider(
        resolve(s.root, 'backup-mock-remote'),
        s.a.sources[0]!.raw.bytes(),
      );
      const knownTask = await s.store.createTask(s.project.id, snapshot()),
        unknownTask = await s.store.createTask(s.project.id, snapshot());
      await s.store.taskScope(knownTask.id, async () => {
        const intent = await s.store.taskIntent(knownTask.id, 0),
          remote = await provider.submit(
            freezeTaskSnapshot(knownTask.snapshot),
            new AbortController().signal,
          );
        if (remote.outcome !== 'KNOWN') throw Error('Mock submit failed');
        await s.store.submissionOutcome(knownTask.id, 1, intent.id, 'KNOWN', remote.predictionId);
      });
      await s.store.taskScope(unknownTask.id, async () => {
        await s.store.taskIntent(unknownTask.id, 0);
        await provider.submit(
          freezeTaskSnapshot(unknownTask.snapshot),
          new AbortController().signal,
        );
      });
      let writer: Promise<unknown> | undefined;
      await s.store.gate.pause(async () => {
        writer = s.store.createProject('backup-paused-writer-' + s.project.id);
        let waiting = false;
        for (let i = 0; i < 100 && !waiting; i++) {
          const locks: unknown = await s.store.db
            .$queryRaw`SELECT pid FROM pg_locks WHERE locktype='advisory' AND classid=6006 AND objid=0 AND NOT granted`;
          waiting = Array.isArray(locks) && locks.length > 0;
          if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        expect(
          await s.store.db.project.count({
            where: { name: 'backup-paused-writer-' + s.project.id },
          }),
        ).toBe(0);
      });
      await writer;

      const destination = resolve(s.root, 'new-backup-parent', 'backup'),
        manifest = await backup(s.store, destination, pgBin);
      expect((await verifyBackup(destination)).manifest).toEqual(manifest);
      const target = new URL(databaseUrl!),
        name = 'tileset_restore_' + s.project.id.replaceAll('-', '');
      target.pathname = '/' + name;
      const client = new pg.Client({ connectionString: databaseUrl! });
      await client.connect();
      try {
        await client.query(`CREATE DATABASE "${name}"`);
      } finally {
        await client.end();
      }
      restored = new Persistence(
        target.href,
        resolve(s.root, 'new-restore-parent', 'assets'),
        PROFILE,
      );
      const restoredManifest = await restore(restored, destination, pgBin);
      expect(restoredManifest.databaseDigest).toBe(manifest.databaseDigest);
      const executor = new Executor(
        restored,
        { adapterFor: () => provider },
        new Archiver(restored, provider),
      );
      await executor.resume(unknownTask.id, 'RECONCILE_UNKNOWN_NO_RESUBMIT');
      await executor.resume(knownTask.id, 'QUERY_KNOWN_ID');
      expect((await restored.task(unknownTask.id))?.state).toBe('SUBMISSION_UNKNOWN');
      expect((await restored.task(knownTask.id))?.state).toBe('REMOTE_RUNNING');
      expect(await provider.ids()).toHaveLength(2);

      expect(
        (await lstat(resolve(restored.storage.root, 'builds', retired.id, 'A1.png'))).mode & 0o222,
      ).toBe(0);
      const replay = await restored.readBuild(retired.id);
      expect(replay.replay.snapshot.slots.filter((s) => s.state === 'RETIRED')).toHaveLength(2);
      const next = await restored.prepareBuild(s.project.id, s.pack.id, s.adopted.id, [], context);
      await restored.publish(next);
      const rebuilt = await restored.readBuild(next.id);
      expect(rebuilt.replay.atlases.a1.pixelHash).toBe(replay.replay.atlases.a1.pixelHash);
      expect(rebuilt.replay.atlases.a2.pixelHash).toBe(replay.replay.atlases.a2.pixelHash);
      await evidence('backup-restore', {
        manifest,
        sourceDatabase: fixtureName,
        sourceAssetRoot: s.store.storage.root,
        fixtureMigration: {
          command: [
            'pnpm',
            '--filter',
            '@tileset/api',
            'exec',
            'prisma',
            'migrate',
            'deploy',
            '--schema',
            'prisma/schema.prisma',
          ],
          exitCode: migrated.status,
        },
        restoreDatabase: name,
        restorePort: target.port,
        assetRoot: restored.storage.root,
        retired: retired.id,
        rebuilt: next.id,
        history: await restored.db.packVersion.count({ where: { packId: s.pack.id } }),
      });
      const dump = await readFile(resolve(destination, 'database.dump'));
      await writeFile(
        resolve(destination, 'database.dump'),
        Buffer.concat([dump, Buffer.from('corrupt')]),
      );
      await expect(verifyBackup(destination)).rejects.toThrow();
    } finally {
      await restored?.close();
      await s.store.close();
    }
  });
});
