import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, lstat, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import pg from 'pg';
import {
  Persistence,
  backup,
  restore,
  archiveDomain,
  resolveAssetRoot,
} from '@tileset/persistence';
import type { GateLease } from '@tileset/persistence';
import { Executor, Archiver, MockProvider } from '@tileset/local-executor';
import { RawSource, validatedDecodedSource } from '@tileset/asset-core';
import { shorelineRecipe } from '@tileset/material-processing';
import { fixture } from '../../../material-processing/tests/fixture.js';
import { setup, snapshot, context, databaseUrl, PROFILE, pgBin, runRoot } from '../helpers.js';

async function record(name: string, value: unknown) {
  await mkdir(resolve('.local/step06/fix-round1/results'), { recursive: true });
  await writeFile(
    resolve('.local/step06/fix-round1/results', name + '-' + randomUUID() + '.json'),
    JSON.stringify(value, null, 2) + '\n',
  );
}
function barrier() {
  let release!: () => void, reach!: (lease: GateLease) => void;
  const resumed = new Promise<void>((r) => (release = r)),
    reached = new Promise<GateLease>((r) => (reach = r));
  return {
    reached,
    release,
    async stop(lease: GateLease) {
      reach(lease);
      await resumed;
    },
  };
}
async function observer() {
  const client = new pg.Client({ connectionString: databaseUrl! });
  await client.connect();
  return client;
}
async function terminateOwned(client: pg.Client, lease: GateLease) {
  const owned = await client.query(
    "SELECT pid FROM pg_locks WHERE pid=$1 AND locktype='advisory' AND classid=6006 AND objid=0 AND granted",
    [lease.backendPid],
  );
  expect(owned.rows).toHaveLength(1);
  await client.query('SELECT pg_terminate_backend($1)', [lease.backendPid]);
  for (let i = 0; i < 100; i++) {
    if (
      !(await client.query('SELECT 1 FROM pg_stat_activity WHERE pid=$1', [lease.backendPid]))
        .rowCount
    )
      return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error('Owned gate backend did not close');
}
async function cli(args: string[], env: NodeJS.ProcessEnv, cwd = process.cwd()) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((accept, reject) => {
    const child = spawn(process.execPath, args, { env, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (chunk) => (stdout += String(chunk)));
    child.stderr.on('data', (chunk) => (stderr += String(chunk)));
    const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      accept({ code, stdout, stderr });
    });
  });
}
async function newDatabase(prefix: string) {
  const name = 'tileset_' + prefix + '_' + randomUUID().replaceAll('-', ''),
    url = new URL(databaseUrl!);
  const client = await observer();
  try {
    await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
  url.pathname = '/' + name;
  return { name, url: url.href };
}
async function deploy(url: string) {
  return new Promise<void>((accept, reject) => {
    const child = spawn(
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
      { env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore' },
    );
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? accept() : reject(Error('Owned fixture migration failed')),
    );
  });
}
async function isolated() {
  const db = await newDatabase('fix_fixture');
  await deploy(db.url);
  const s = await setup(undefined, { url: db.url, assetRoot: resolve(runRoot, db.name, 'assets') });
  return { ...s, databaseName: db.name, url: db.url };
}
async function sameByteVersions(store: Persistence, projectId: string) {
  const input = fixture(),
    base = input.sources[0]!,
    sources = [];
  for (const revision of [1, 2, 2147483647]) {
    const bytes = base.raw.bytes(),
      raw = new RawSource({
        id: 'exact-reference-grass',
        revision,
        role: 'grass',
        density: base.raw.density,
        encoding: 'rgba8',
        bytes,
        provenance: { ...base.raw.provenance, toolVersion: 'reference-' + revision },
      }),
      source = validatedDecodedSource(raw, base.image.pixels());
    const recipe = shorelineRecipe(
      'exact-reference-recipe',
      revision === 2147483647 ? 3 : revision,
      { ...input.recipe.value, grass: source.ref },
    );
    await store.saveDomainArchive(
      projectId,
      archiveDomain({ ...input, sources: [source, ...input.sources.slice(1)], recipe }),
    );
    sources.push(source);
  }
  const asset = await store.db.originalAsset.findUniqueOrThrow({
    where: { projectId_logicalId: { projectId, logicalId: 'exact-reference-grass' } },
  });
  return { asset, sources, sha256: sources[0]!.raw.encodedHash };
}

describe('STEP06 round1 lifetime/references/operational CLI regressions', () => {
  it('lost shared/scope session after durable intent cannot submit under maintenance; restart stays UNKNOWN', async () => {
    const root = resolve(runRoot, randomUUID()),
      store = new Persistence(databaseUrl!, resolve('.local/assets'), PROFILE),
      client = await observer(),
      b = barrier();
    let pending: Promise<void> | undefined;
    try {
      const project = await store.createProject('gate-intent-loss');
      await store.projectSnapshot(project.id);
      const task = await store.createTask(project.id, snapshot()),
        provider = new MockProvider(
          resolve(root, 'remote'),
          await readFile('tests/fixtures/art-ground.png'),
        );
      const executor = new Executor(
        store,
        { adapterFor: () => provider },
        new Archiver(store, provider),
        async (point) => {
          if (point === 'intent-durable') await b.stop(store.gate.require());
        },
      );
      pending = executor.resume(task.id, 'WAIT');
      const observed = pending.then(
        () => ({ ok: true }),
        (error) => ({ ok: false, error: String(error) }),
      );
      const lease = await b.reached;
      await terminateOwned(client, lease);
      await client.query('SELECT pg_advisory_lock(6006,0)');
      b.release();
      const outcome = await observed;
      expect(outcome.ok).toBe(false);
      expect(await provider.ids()).toHaveLength(0);
      expect((await store.taskDetail(task.id)).state).toBe('SUBMITTING');
      await client.query('SELECT pg_advisory_unlock(6006,0)');
      const fresh = new Executor(
        store,
        { adapterFor: () => provider },
        new Archiver(store, provider),
      );
      await fresh.resume(task.id, 'RECONCILE_UNKNOWN_NO_RESUBMIT');
      expect((await store.taskDetail(task.id)).state).toBe('SUBMISSION_UNKNOWN');
      await fresh.resume(task.id, 'WAIT');
      expect(await provider.ids()).toHaveLength(0);
      await record('intent-gate-loss', {
        backendPid: lease.backendPid,
        exclusiveBeforeRelease: true,
        outcome,
        taskId: task.id,
        remoteIds: await provider.ids(),
        state: (await store.taskDetail(task.id)).state,
      });
    } finally {
      b.release();
      await client.end();
      await pending?.catch(() => {});
      await store.close();
    }
  });
  it('a possibly started remote request is not undone or re-purchased after gate loss', async () => {
    const store = new Persistence(databaseUrl!, resolve('.local/assets'), PROFILE),
      client = await observer(),
      b = barrier();
    let pending: Promise<void> | undefined;
    try {
      const project = await store.createProject('gate-remote-loss');
      await store.projectSnapshot(project.id);
      const task = await store.createTask(project.id, snapshot()),
        provider = new MockProvider(
          resolve(runRoot, randomUUID(), 'remote'),
          await readFile('tests/fixtures/art-ground.png'),
          async (point) => {
            if (point === 'remote-created') await b.stop(store.gate.require());
          },
        );
      const executor = new Executor(
        store,
        { adapterFor: () => provider },
        new Archiver(store, provider),
      );
      pending = executor.resume(task.id, 'WAIT');
      const observed = pending.then(
        () => true,
        () => false,
      );
      const lease = await b.reached;
      await terminateOwned(client, lease);
      await client.query('SELECT pg_advisory_lock(6006,0)');
      b.release();
      expect(await observed).toBe(false);
      expect(await provider.ids()).toHaveLength(1);
      expect((await store.taskDetail(task.id)).predictionId).toBeNull();
      await client.query('SELECT pg_advisory_unlock(6006,0)');
      await executor.resume(task.id, 'WAIT');
      expect((await store.taskDetail(task.id)).state).toBe('SUBMISSION_UNKNOWN');
      expect(await provider.ids()).toHaveLength(1);
      await record('remote-uncertainty', {
        backendPid: lease.backendPid,
        taskId: task.id,
        state: 'SUBMISSION_UNKNOWN',
        remoteIds: await provider.ids(),
      });
    } finally {
      b.release();
      await client.end();
      await pending?.catch(() => {});
      await store.close();
    }
  });
  it('lost pack scope stops partial files, immutable rename and DB registration; xact fence drains before maintenance', async () => {
    let point = '',
      b = barrier();
    const s = await setup(async (phase) => {
        if (phase === point) await b.stop(s.store.gate.require());
      }),
      client = await observer();
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
      const results = [];
      for (const phase of [
        'build-file-partial',
        'build-validated',
        'before-db-commit',
        'db-transaction',
      ]) {
        point = phase;
        b = barrier();
        const pending = s.store.publish(next),
          observed = pending.then(
            (value) => ({ ok: true, value }),
            (error) => ({ ok: false, error: String(error) }),
          );
        const lease = await b.reached;
        await terminateOwned(client, lease);
        if (phase === 'db-transaction') {
          expect(
            (await client.query('SELECT pg_try_advisory_lock(6006,0) AS locked')).rows[0].locked,
          ).toBe(false);
          b.release();
          const outcome = await observed;
          expect(outcome.ok).toBe(false);
          await client.query('SELECT pg_advisory_lock(6006,0)');
          results.push({ phase, outcome, transactionFence: true });
        } else {
          await client.query('SELECT pg_advisory_lock(6006,0)');
          b.release();
          const outcome = await observed;
          expect(outcome.ok).toBe(false);
          results.push({ phase, outcome });
        }
        expect(await s.store.db.build.findUnique({ where: { id: next.id } })).toBeNull();
        expect(
          (await s.store.db.project.findUniqueOrThrow({ where: { id: s.project.id } }))
            .successfulBuildId,
        ).toBe(first.id);
        if (phase === 'build-file-partial' || phase === 'build-validated')
          await expect(lstat(resolve(s.store.storage.root, 'builds', next.id))).rejects.toThrow();
        await client.query('SELECT pg_advisory_unlock(6006,0)');
      }
      point = '';
      expect((await s.store.publish(next)).publication).toBe('ADOPTED');
      await record('publication-gate-loss', { results, previous: first.id, recovered: next.id });
    } finally {
      b.release();
      await client.end();
      await s.store.close();
    }
  });
  it('losing the exclusive backup session stops copying/completion and cannot produce a successful backup', async () => {
    const s = await isolated(),
      client = new pg.Client({ connectionString: s.url });
    await client.connect();
    let b = barrier(),
      point = 'backup-view-verified';
    const writer = new Persistence(s.url, s.store.storage.root, PROFILE, async (phase) => {
      if (phase === point) await b.stop(writer.gate.require());
    });
    try {
      const first = await s.store.prepareBuild(
        s.project.id,
        s.pack.id,
        s.adopted.id,
        s.operations,
        context,
      );
      await s.store.publish(first);
      const results = [];
      for (const phase of [
        'backup-view-verified',
        'backup-file-copied',
        'backup-before-manifest',
      ]) {
        point = phase;
        b = barrier();
        const destination = resolve(s.root, phase),
          pending = backup(writer, destination, pgBin),
          observed = pending.then(
            (value) => ({ ok: true, value }),
            (error) => ({ ok: false, error: String(error) }),
          );
        const lease = await b.reached;
        await terminateOwned(client, lease);
        await client.query('SELECT pg_advisory_lock(6006,0)');
        b.release();
        const outcome = await observed;
        expect(outcome.ok).toBe(false);
        await expect(lstat(resolve(destination, 'manifest.json'))).rejects.toThrow();
        await client.query('SELECT pg_advisory_unlock(6006,0)');
        results.push({ phase, outcome, backendPid: lease.backendPid });
      }
      await record('backup-gate-loss', { database: s.databaseName, results });
    } finally {
      b.release();
      await client.end();
      await writer.close();
      await s.store.close();
    }
  });
  it('references use exact persisted integer revisions even for identical bytes, including restore controls', async () => {
    const s = await isolated();
    let restored: Persistence | undefined;
    try {
      const refs = await sameByteVersions(s.store, s.project.id);
      expect(new Set(refs.sources.map((source) => source.raw.encodedHash)).size).toBe(1);
      expect(refs.sources[0]!.ref.contentHash).not.toBe(refs.sources[1]!.ref.contentHash);
      const make = (revision: string, sha256 = refs.sha256) =>
        s.store.createTask(s.project.id, {
          ...snapshot(),
          taskKind: 'IMAGE_EDIT',
          references: [{ assetId: refs.asset.id, revision, sha256 }],
        });
      const tasks = [];
      for (const revision of ['1', '2', '2147483647']) {
        const task = await make(revision);
        expect((await s.store.task(task.id))?.snapshot.references[0]?.revision).toBe(revision);
        tasks.push(task.id);
      }
      const count = await s.store.db.logicalTask.count();
      for (const value of [
        '0',
        '-1',
        '01',
        '1.0',
        '1e0',
        '3',
        '2147483648',
        '9007199254740992',
        'NaN',
        ' ',
        '',
      ])
        await expect(make(value)).rejects.toThrow();
      await expect(make('2', '0'.repeat(64))).rejects.toThrow();
      expect(await s.store.db.logicalTask.count()).toBe(count);
      const destination = resolve(s.root, 'reference-backup');
      await backup(s.store, destination, pgBin);
      const db = await newDatabase('fix_reference_restore');
      restored = new Persistence(db.url, resolve(s.root, 'reference-restored'), PROFILE);
      await restore(restored, destination, pgBin);
      for (const revision of ['1', '2', '2147483647']) {
        const task = await restored.createTask(s.project.id, {
          ...snapshot(),
          taskKind: 'IMAGE_EDIT',
          references: [{ assetId: refs.asset.id, revision, sha256: refs.sha256 }],
        });
        expect((await restored.task(task.id))?.snapshot.references[0]?.revision).toBe(revision);
      }
      await record('exact-reference', {
        sourceDb: s.databaseName,
        restoreDb: db.name,
        sha256: refs.sha256,
        revisions: [1, 2, 2147483647],
        frozenTasks: tasks,
        negativeControls: 12,
      });
    } finally {
      await restored?.close();
      await s.store.close();
    }
  });
  it('real maintenance and Mock CLIs share configured owned root; restore is readable/rebuildable and refuses existing targets', async () => {
    const s = await isolated();
    let restored: Persistence | undefined;
    try {
      const prepared = await s.store.prepareBuild(
        s.project.id,
        s.pack.id,
        s.adopted.id,
        s.operations,
        context,
      );
      await s.store.publish(prepared);
      const name = 'fix-cli-' + randomUUID(),
        env = { ...process.env, DATABASE_URL: s.url, TILESET_ASSET_ROOT: s.store.storage.root };
      const cliPath = resolve('dist/scripts/step06-maintenance.js'),
        mockPath = resolve('dist/scripts/run-mock-executor.js');
      const create = await cli([mockPath, 'create', s.project.id], env);
      expect(create.code).toBe(0);
      const task = JSON.parse(create.stdout.trim());
      const submit = await cli([mockPath, 'resume', task.taskId], env);
      expect(submit.code).toBe(0);
      const remote = JSON.parse(submit.stdout.trim());
      expect((await cli([mockPath, 'complete', remote.predictionId], env)).code).toBe(0);
      expect((await cli([mockPath, 'resume', task.taskId], env)).code).toBe(0);
      const detail = await s.store.taskDetail(task.taskId);
      expect(detail.state).toBe('COMPLETED');
      for (const artifact of detail.artifacts)
        await s.store.storage.read(
          await s.store.db.fileObject.findUniqueOrThrow({ where: { sha256: artifact.sha256 } }),
        );
      const saved = await cli([cliPath, 'backup', name], env);
      expect(saved.code).toBe(0);
      expect((await cli([cliPath, 'backup', name], env)).code).not.toBe(0);
      const db = await newDatabase('fix_cli_restore'),
        requested = resolve(s.root, 'requested-assets'),
        restoredEnv = { ...env, DATABASE_URL: db.url, TILESET_ASSET_ROOT: requested };
      const result = await cli([cliPath, 'restore', name], restoredEnv);
      expect(result.code).toBe(0);
      expect((await lstat(requested)).isDirectory()).toBe(true);
      restored = new Persistence(db.url, requested, PROFILE);
      const read = await restored.readBuild(prepared.id);
      const next = await restored.prepareBuild(s.project.id, s.pack.id, s.adopted.id, [], context);
      await restored.publish(next);
      expect((await restored.readBuild(next.id)).replay.atlases.a1.pixelHash).toBe(
        read.replay.atlases.a1.pixelHash,
      );
      expect((await cli([cliPath, 'restore', name], restoredEnv)).code).not.toBe(0);
      expect(await resolveAssetRoot({})).toBe(resolve('.local/assets'));
      await expect(
        resolveAssetRoot({ TILESET_ASSET_ROOT: resolve('../outside-assets') }),
      ).rejects.toThrow();
      await expect(
        resolveAssetRoot({ TILESET_ASSET_ROOT: '.local/postgres/assets' }),
      ).rejects.toThrow();
      await expect(resolveAssetRoot({ TILESET_ASSET_ROOT: '' })).rejects.toThrow();
      const redirected = resolve(s.root, 'symlink-assets');
      await symlink(resolve('.local/assets'), redirected);
      await expect(resolveAssetRoot({ TILESET_ASSET_ROOT: redirected })).rejects.toThrow();
      await record('operational-cli', {
        sourceDb: s.databaseName,
        restoreDb: db.name,
        sourceRoot: s.store.storage.root,
        requestedRoot: requested,
        backup: name,
        buildId: prepared.id,
        rebuiltId: next.id,
        mockTaskId: task.taskId,
        commands: [create.code, submit.code, saved.code, result.code],
        defaultRoot: '.local/assets',
        existingTargets: 'REJECTED',
      });
    } finally {
      await restored?.close();
      await s.store.close();
    }
  });
});
