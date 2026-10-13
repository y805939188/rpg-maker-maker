import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { Persistence, GateLostError, resolveAssetRoot } from '@tileset/persistence';
import type { GateLease } from '@tileset/persistence';
import { Executor, Archiver, MockProvider } from '@tileset/local-executor';
import { databaseUrl, PROFILE, snapshot, runRoot, setup, context } from '../helpers.js';

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
async function record(name: string, value: unknown) {
  const root = resolve('.local/step06/fix-round2/results');
  await mkdir(root, { recursive: true });
  await writeFile(
    resolve(root, name + '-' + randomUUID() + '.json'),
    JSON.stringify(value, null, 2) + '\n',
  );
}
async function observer() {
  const client = new pg.Client({ connectionString: databaseUrl! });
  await client.connect();
  return client;
}
async function terminateOwned(client: pg.Client, lease: GateLease) {
  expect(
    (
      await client.query(
        "SELECT pid FROM pg_locks WHERE pid=$1 AND locktype='advisory' AND classid=6006 AND objid=0 AND granted",
        [lease.backendPid],
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (await client.query('SELECT pg_terminate_backend($1) AS killed', [lease.backendPid])).rows[0]
      .killed,
  ).toBe(true);
  for (let n = 0; n < 100; n++) {
    if (
      lease.signal.aborted &&
      !(await client.query('SELECT 1 FROM pg_stat_activity WHERE pid=$1', [lease.backendPid]))
        .rowCount
    )
      return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error('Owned parent backend did not close');
}

describe('round2 nested lifetimes and filesystem ownership', () => {
  it('parent scope loss reaches active executor children; durable intent and possible submission recover conservatively', async () => {
    const store = new Persistence(databaseUrl!, resolve('.local/assets'), PROFILE),
      client = await observer();
    const results = [];
    try {
      for (const phase of ['intent-durable', 'remote-created']) {
        const b = barrier(),
          project = await store.createProject('nested-' + phase);
        await store.projectSnapshot(project.id);
        const task = await store.createTask(project.id, snapshot());
        let parent!: GateLease;
        const stop = async (point: string) => {
          if (point === phase) await b.stop(store.gate.require());
        };
        const provider = new MockProvider(
            resolve(runRoot, task.id, 'remote'),
            await readFile('tests/fixtures/art-ground.png'),
            stop,
          ),
          executor = new Executor(
            store,
            { adapterFor: () => provider },
            new Archiver(store, provider),
            stop,
          );
        const pending = store.gate.write(async (lease) => {
          parent = lease;
          await executor.resume(task.id, 'WAIT');
        }, 'parent:' + task.id);
        const outcome = pending.then(
          () => ({ ok: true }),
          (error) => ({ ok: false, error: String(error) }),
        );
        try {
          const child = await b.reached;
          expect(parent.backendPid).not.toBe(child.backendPid);
          await terminateOwned(client, parent);
          expect(child.signal.aborted).toBe(true);
          expect(child.signal.reason).toBeInstanceOf(GateLostError);
          b.release();
          expect((await outcome).ok).toBe(false);
          const detail = await store.taskDetail(task.id);
          expect(detail.state).toBe('SUBMITTING');
          expect(detail.predictionId).toBeNull();
          expect(await provider.ids()).toHaveLength(phase === 'remote-created' ? 1 : 0);
          // Descendant session is released too: another maintenance connection can proceed.
          await client.query('SELECT pg_advisory_lock(6006,0)');
          await client.query('SELECT pg_advisory_unlock(6006,0)');
          const fresh = new Executor(
            store,
            { adapterFor: () => provider },
            new Archiver(store, provider),
          );
          await fresh.resume(task.id, 'WAIT');
          await fresh.resume(task.id, 'WAIT');
          expect((await store.taskDetail(task.id)).state).toBe('SUBMISSION_UNKNOWN');
          expect(await provider.ids()).toHaveLength(phase === 'remote-created' ? 1 : 0);
          results.push({
            phase,
            parentPid: parent.backendPid,
            childPid: child.backendPid,
            childAbortedBeforeRelease: true,
            remoteIds: await provider.ids(),
            taskId: task.id,
            state: 'SUBMISSION_UNKNOWN',
          });
        } finally {
          b.release();
          await outcome;
        }
      }
      await record('nested-executor-loss', results);
    } finally {
      await client.end();
      await store.close();
    }
  });

  it('a new public write after inherited loss rejects before creating another lease or committing', async () => {
    const store = new Persistence(databaseUrl!, resolve('.local/assets'), PROFILE),
      client = await observer(),
      b = barrier();
    const equivalentUrl = new URL(databaseUrl!);
    equivalentUrl.protocol = equivalentUrl.protocol === 'postgres:' ? 'postgresql:' : 'postgres:';
    const reconstructed = new Persistence(equivalentUrl.href, resolve('.local/assets'), PROFILE);
    const name = 'lost-parent-public-' + randomUUID();
    let createdId: string | undefined;
    const pending = store.gate
      .write(async (parent) => {
        await b.stop(parent);
        createdId = (await reconstructed.createProject(name)).id;
      }, 'parent-new-' + randomUUID())
      .then(
        () => true,
        () => false,
      );
    try {
      const parent = await b.reached;
      await terminateOwned(client, parent);
      b.release();
      expect(await pending).toBe(false);
      expect(createdId).toBeUndefined();
      expect(await store.db.project.count({ where: { name } })).toBe(0);
      await record('new-child-after-loss', {
        parentPid: parent.backendPid,
        created: false,
        committed: false,
      });
    } finally {
      b.release();
      await pending;
      await client.end();
      await store.close();
      await reconstructed.close();
    }
  });

  it('normal nesting, explicit scope reentry rejection and independently queued/concurrent writes retain their lifetimes', async () => {
    const store = new Persistence(databaseUrl!, resolve('.local/assets'), PROFILE),
      gate = store.gate;
    let b = barrier(),
      pending: Promise<unknown> | undefined,
      queued: Promise<unknown> | undefined,
      inside: Promise<unknown> | undefined;
    try {
      const result = await gate.write(async (parent) => {
        const project = await store.createProject('normal-nested-public');
        await gate.write(async (child) => {
          expect(child.backendPid).not.toBe(parent.backendPid);
          await expect(gate.write(async () => {}, parent.scope)).rejects.toThrow('reentry');
          await child.checkpoint();
        }, 'child-' + randomUUID());
        expect(parent.signal.aborted).toBe(false);
        await expect(gate.pause(async () => {})).rejects.toThrow('Nested maintenance');
        return project.id;
      }, 'normal-parent-' + randomUUID());
      expect(await store.db.project.findUnique({ where: { id: result } })).not.toBeNull();
      let ended!: GateLease, late!: () => Promise<unknown>;
      await gate.write(async (lease) => {
        ended = lease;
        const inherited = AsyncLocalStorage.snapshot();
        late = () => inherited(() => store.createProject('after-normal-parent-end'));
      });
      expect(ended.signal.aborted).toBe(true);
      expect(ended.signal.reason).not.toBeInstanceOf(GateLostError);
      await expect(late()).rejects.toThrow('lifetime ended');
      pending = gate.pause(async (lease) => {
        await expect(gate.pause(async () => {})).rejects.toThrow('Nested maintenance');
        inside = store.createProject('inside-live-maintenance-queued');
        await b.stop(lease);
      });
      await b.reached;
      let queuedDone = false;
      queued = store.createProject('outside-exclusive-queued').then((project) => {
        queuedDone = true;
        return project;
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(queuedDone).toBe(false);
      b.release();
      await pending;
      await queued;
      await inside;
      expect(queuedDone).toBe(true);
      b = barrier();
      pending = gate.write(async (lease) => {
        await b.stop(lease);
      });
      const concurrentParent = await b.reached;
      const concurrent = await store.createProject('independent-concurrent-write');
      expect(concurrent.id).toBeTruthy();
      expect(concurrentParent.signal.aborted).toBe(false);
      b.release();
      await pending;
      await record('normal-nested-queue-concurrent', {
        normalNested: true,
        scopeReentry: 'REJECTED',
        nestedMaintenance: 'REJECTED',
        queuedUntilNormalMaintenanceEnd: true,
        independentConcurrent: true,
        expiredContext: 'REJECTED',
        normalEndIsLoss: false,
      });
    } finally {
      b.release();
      await pending;
      await queued;
      await inside;
      await store.close();
    }
  });

  it('maintenance loss cancels its already queued writer instead of treating loss as normal release', async () => {
    const store = new Persistence(databaseUrl!, resolve('.local/assets'), PROFILE),
      client = await observer(),
      b = barrier();
    const name = 'lost-maintenance-queue-' + randomUUID();
    let queued!: Promise<boolean>;
    const pending = store.gate
      .pause(async (parent) => {
        queued = store.createProject(name).then(
          () => true,
          () => false,
        );
        await b.stop(parent);
      })
      .then(
        () => true,
        () => false,
      );
    try {
      const parent = await b.reached;
      let waiting = false;
      for (let n = 0; n < 100 && !waiting; n++) {
        waiting =
          (
            await client.query(
              "SELECT 1 FROM pg_locks WHERE locktype='advisory' AND classid=6006 AND objid=0 AND mode='ShareLock' AND NOT granted",
            )
          ).rowCount! > 0;
        if (!waiting) await new Promise((r) => setTimeout(r, 10));
      }
      expect(waiting).toBe(true);
      await terminateOwned(client, parent);
      b.release();
      expect(await pending).toBe(false);
      expect(await queued).toBe(false);
      expect(await store.db.project.count({ where: { name } })).toBe(0);
      await client.query('SELECT pg_advisory_lock(6006,0)');
      await client.query('SELECT pg_advisory_unlock(6006,0)');
      await record('maintenance-queued-loss', {
        parentPid: parent.backendPid,
        pendingSessionObserved: true,
        queuedWriteCommitted: false,
        normalRelease: false,
      });
    } finally {
      b.release();
      await pending;
      await queued;
      await client.end();
      await store.close();
    }
  });

  it('all parent transaction scopes remain fenced after parent session loss until rollback', async () => {
    const store = new Persistence(databaseUrl!, resolve('.local/assets'), PROFILE),
      client = await observer(),
      b = barrier();
    const scope = 'outer-fence-' + randomUUID(),
      innerScope = 'inner-fence-' + randomUUID(),
      name = 'rollback-parent-' + randomUUID();
    let parent!: GateLease;
    const pending = store.gate
      .write(async (lease) => {
        parent = lease;
        await store.gate.write(async (child) => {
          await store.db.$transaction(
            async (tx) => {
              await child.fence(tx);
              await tx.project.create({ data: { name } });
              await b.stop(child);
              await child.checkpoint();
            },
            { timeout: 30000 },
          );
        }, innerScope);
      }, scope)
      .then(
        () => true,
        () => false,
      );
    try {
      const child = await b.reached;
      await terminateOwned(client, parent);
      expect(child.signal.aborted).toBe(true);
      for (const fencedScope of [scope, innerScope])
        expect(
          (
            await client.query('SELECT pg_try_advisory_lock(6008,hashtext($1)) AS locked', [
              fencedScope,
            ])
          ).rows[0].locked,
        ).toBe(false);
      expect(
        (await client.query('SELECT pg_try_advisory_lock(6006,0) AS locked')).rows[0].locked,
      ).toBe(false);
      b.release();
      expect(await pending).toBe(false);
      expect(await store.db.project.count({ where: { name } })).toBe(0);
      await client.query('SELECT pg_advisory_lock(6006,0)');
      await client.query('SELECT pg_advisory_unlock(6006,0)');
      await record('parent-transaction-fence', {
        parentPid: parent.backendPid,
        childPid: child.backendPid,
        fencedScopes: [scope, innerScope],
        rollback: true,
      });
    } finally {
      b.release();
      await pending;
      await client.end();
      await store.close();
    }
  });

  it('parent loss during file writes stops nested publication and preserves the last successful build', async () => {
    const b = barrier();
    let fail = false,
      parent!: GateLease;
    const s = await setup(async (phase) => {
      if (fail && phase === 'build-file-partial') await b.stop(s.store.gate.require());
    });
    const client = await observer();
    let pending: Promise<boolean> | undefined;
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
      fail = true;
      pending = s.store.gate
        .write(async (lease) => {
          parent = lease;
          await s.store.publish(next);
        }, 'parent-pack-' + randomUUID())
        .then(
          () => true,
          () => false,
        );
      const child = await b.reached;
      await terminateOwned(client, parent);
      expect(child.signal.aborted).toBe(true);
      b.release();
      expect(await pending).toBe(false);
      expect(await s.store.db.build.findUnique({ where: { id: next.id } })).toBeNull();
      await expect(lstat(resolve(s.store.storage.root, 'builds', next.id))).rejects.toThrow();
      expect(
        (await s.store.db.project.findUniqueOrThrow({ where: { id: s.project.id } }))
          .successfulBuildId,
      ).toBe(first.id);
      await record('parent-publication-loss', {
        previous: first.id,
        refused: next.id,
        parentPid: parent.backendPid,
        childPid: child.backendPid,
      });
    } finally {
      b.release();
      await pending;
      await client.end();
      await s.store.close();
    }
  });

  it('real owned PostgreSQL case aliases are read-only rejected by configured root resolution', async () => {
    const postgres = await lstat('.local/postgres').catch((error: unknown) => {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      return undefined; // Linux CI service has no project-local data directory.
    });
    const rows = [];
    for (const name of ['postgres', 'Postgres', 'POSTGRES']) {
      const stat = await lstat(resolve('.local', name)).catch(() => undefined),
        sameIdentity = !!postgres && stat?.dev === postgres.dev && stat?.ino === postgres.ino;
      await expect(
        resolveAssetRoot({ TILESET_ASSET_ROOT: `.local/${name}/read-only-probe` }),
      ).rejects.toThrow();
      rows.push({ name, sameIdentity, rejected: true, dev: stat?.dev, ino: stat?.ino });
    }
    expect(await resolveAssetRoot({ TILESET_ASSET_ROOT: '.local/postgres-assets/absent' })).toBe(
      resolve('.local/postgres-assets/absent'),
    );
    await record('postgres-case-identity', {
      rows,
      postgresDev: postgres?.dev,
      postgresIno: postgres?.ino,
      postgresWrites: 'NONE_READ_ONLY',
      localCaseAlias: rows.some((r) => r.name !== 'postgres' && r.sameIdentity),
    });
  });
});
