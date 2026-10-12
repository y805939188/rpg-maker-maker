import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { createReadStream, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, open, copyFile, chmod, rename } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { z } from 'zod';
import type { PackSnapshot } from '@tileset/pack-assembly';
import { fingerprint, validateAdoptionIdentities } from '@tileset/asset-core';
import type { GateLease } from './gate.js';
import { Persistence } from './store.js';
import { ReplaySession, RefSchema, jsonBytes } from './replay.js';

const BackupSchema = z
  .object({
    contract: z.literal('consistent-backup-v1'),
    databaseDigest: z.string().regex(/^[a-f0-9]{64}$/),
    files: z.record(
      z
        .object({ sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive() })
        .strict(),
    ),
  })
  .strict();
const tables = [
  'Project',
  'ProjectSnapshot',
  'FileObject',
  'OriginalAsset',
  'AssetRevision',
  'RevisionDependency',
  'ProcessingRecord',
  'Pack',
  'PackVersion',
  'SlotVersion',
  'Build',
  'BuildFile',
  'AcceptanceRecord',
  'LogicalTask',
  'SubmissionAttempt',
  'TaskArtifact',
];
async function digest(store: Persistence) {
  const data: Record<string, unknown> = {};
  for (const table of tables) {
    const rows: unknown = await store.db.$queryRawUnsafe(
      `SELECT row_to_json(t) AS row FROM "${table}" t`,
    );
    assert.ok(Array.isArray(rows));
    data[table] = rows.map((row) => JSON.stringify(row)).sort();
  }
  return fingerprint(data);
}
export async function verifyDatabase(store: Persistence) {
  for (const file of await store.db.fileObject.findMany()) await store.storage.read(file);
  const session = new ReplaySession();
  const builds = new Map<string, Awaited<ReturnType<Persistence['readBuild']>>>();
  for (const build of await store.db.build.findMany())
    builds.set(build.id, await store.readBuild(build.id, session));
  const projects = await store.db.project.findMany();
  for (const p of projects) {
    if (
      await store.db.processingRecord.count({ where: { projectId: p.id, stage: 'MZ_FRAGMENTS' } })
    )
      await store.loadArchives(p.id, session);
    if (p.successfulBuildId) assert.equal(builds.get(p.successfulBuildId)?.record.projectId, p.id);
  }
  for (const processing of await store.db.processingRecord.findMany({ where: { stage: 'IR' } }))
    await store.readDomainRecipe(processing.projectId, processing.recipeId);
  const recipeSources = new Set(
    (await store.db.revisionDependency.findMany({ include: { to: true } }))
      .filter((dep) => dep.to.kind === 'source')
      .map((dep) => dep.toId),
  );
  for (const source of await store.db.assetRevision.findMany({ where: { kind: 'source' } }))
    if (!recipeSources.has(source.id)) await store.readSource(source.id);
  for (const snapshot of await store.db.projectSnapshot.findMany()) {
    const adoption = RefSchema.array().parse(snapshot.adoption);
    validateAdoptionIdentities(adoption);
    assert.equal(
      snapshot.id,
      fingerprint({ projectId: snapshot.projectId, revision: snapshot.revision }),
    );
    assert.equal(
      snapshot.contentHash,
      fingerprint({ projectId: snapshot.projectId, revision: snapshot.revision, adoption }),
    );
    for (const ref of adoption) {
      const row = await store.db.assetRevision.findFirstOrThrow({
        where: {
          projectId: snapshot.projectId,
          kind: ref.kind,
          logicalId: ref.id,
          revision: ref.revision,
        },
      });
      assert.equal(row.contentHash, ref.contentHash);
    }
  }
  for (const pack of await store.db.pack.findMany()) {
    const history = await store.db.packVersion.findMany({
      where: { packId: pack.id },
      orderBy: { version: 'asc' },
      include: { slots: true },
    });
    assert.equal(history.length, pack.version);
    if (pack.version) {
      assert.ok(pack.currentBuildId);
      const build = builds.get(pack.currentBuildId);
      assert.ok(build);
      assert.equal(build.record.packId, pack.id);
      assert.equal(build.record.publication, 'ADOPTED');
      assert.equal(build.replay.snapshot.contentHash, pack.headHash);
      assert.deepEqual(
        history.map((r) => r.snapshot),
        [...build.replay.history, build.replay.snapshot],
      );
      for (const [index, row] of history.entries()) {
        const snapshot: PackSnapshot =
          index === history.length - 1 ? build.replay.snapshot : build.replay.history[index]!;
        assert.equal(row.hash, snapshot.contentHash);
        assert.deepEqual(
          row.slots
            .map((s) => ({ atlas: s.atlas, kind: s.kind, state: s.state, binding: s.binding }))
            .sort((a, b) => a.atlas.localeCompare(b.atlas) || a.kind - b.kind),
          [...snapshot.slots].sort((a, b) => a.atlas.localeCompare(b.atlas) || a.kind - b.kind),
        );
      }
    }
  }
  for (const task of await store.db.logicalTask.findMany()) await store.task(task.id);
  return digest(store);
}
async function command(binary: string, args: string[], url: string, lease: GateLease) {
  await lease.checkpoint();
  const u = new URL(url);
  await new Promise<void>((accept, reject) => {
    const child = spawn(binary, args, {
      env: {
        ...process.env,
        PGHOST: u.hostname,
        PGPORT: u.port || '5432',
        PGUSER: decodeURIComponent(u.username),
        PGPASSWORD: decodeURIComponent(u.password),
        PGDATABASE: u.pathname.slice(1),
      },
      stdio: ['ignore', 'ignore', 'pipe'],
      signal: lease.signal,
      killSignal: 'SIGKILL',
    });
    // Database stderr is kept out of errors/logs because it can contain private values.
    child.stderr.resume();
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, 60000);
    let failed = false;
    child.on('error', () => {
      failed = true;
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (lease.signal.aborted) reject(lease.signal.reason);
      else if (code === 0 && !failed) accept();
      else reject(Error('Backup PostgreSQL tool failed'));
    });
  });
}
async function filesUnder(directory: string) {
  const out: Record<string, string> = {};
  async function visit(path: string) {
    for (const item of await readdir(path, { withFileTypes: true })) {
      const full = resolve(path, item.name),
        stat = await lstat(full);
      assert.ok(!stat.isSymbolicLink());
      if (stat.isDirectory()) await visit(full);
      else {
        assert.ok(stat.isFile());
        out[relative(directory, full)] = full;
      }
    }
  }
  await visit(directory);
  return out;
}
async function fileHash(path: string, lease?: GateLease) {
  lease?.check();
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path, lease ? { signal: lease.signal } : {})) {
    lease?.check();
    bytes += chunk.length;
    hash.update(chunk);
  }
  lease?.check();
  return { sha256: hash.digest('hex'), bytes };
}
async function sync(path: string) {
  const fd = await open(path, 'r');
  try {
    await fd.sync();
  } finally {
    await fd.close();
  }
}
async function copy(source: string, target: string, lease: GateLease) {
  const step = <T>(operation: () => Promise<T>) => checked(lease, operation);
  await step(() => mkdir(resolve(target, '..'), { recursive: true, mode: 0o700 }));
  await step(() => copyFile(source, target, constants.COPYFILE_EXCL));
  await step(() => chmod(target, 0o600));
  await step(() => sync(target));
  await step(() => sync(resolve(target, '..')));
}
async function write(path: string, bytes: Uint8Array, lease: GateLease) {
  const step = <T>(operation: () => Promise<T>) => checked(lease, operation);
  await lease.checkpoint();
  await step(() => mkdir(resolve(path, '..'), { recursive: true, mode: 0o700 }));
  const file = await open(path, 'wx', 0o600);
  try {
    await lease.checkpoint();
    await file.writeFile(bytes, { signal: lease.signal });
    await lease.checkpoint();
    await file.sync();
    await lease.checkpoint();
  } finally {
    await file.close();
  }
  const parent = await open(resolve(path, '..'), 'r');
  try {
    await parent.sync();
  } finally {
    await parent.close();
  }
}
async function checked<T>(lease: GateLease, operation: () => Promise<T>) {
  await lease.checkpoint();
  const value = await operation();
  await lease.checkpoint();
  return value;
}
/** Stops cooperative writes, executor submit/query/archive and cleanup across all instance processes. */
export async function backup(store: Persistence, destination: string, pgBin: string) {
  return store.gate.pause(async (lease) => {
    const step = <T>(operation: () => Promise<T>) => checked(lease, operation);
    const databaseDigest = await step(() => verifyDatabase(store));
    await step(() => store.fault('backup-view-verified'));
    await step(() => mkdir(resolve(destination, '..'), { recursive: true, mode: 0o700 }));
    await step(() => mkdir(destination, { mode: 0o700 }));
    await command(
      resolve(pgBin, 'pg_dump'),
      [
        '--format=custom',
        '--no-owner',
        '--no-privileges',
        '--file',
        resolve(destination, 'database.dump'),
      ],
      store.databaseUrl,
      lease,
    );
    await step(() => sync(resolve(destination, 'database.dump')));
    const files: Record<string, { sha256: string; bytes: number }> = {
      'database.dump': await fileHash(resolve(destination, 'database.dump'), lease),
    };
    for (const directory of ['objects', 'builds']) {
      await store.storage.initialize();
      for (const [name, source] of Object.entries(
        await filesUnder(resolve(store.storage.root, directory)),
      )) {
        const key = `assets/${directory}/${name}`;
        await copy(source, resolve(destination, key), lease);
        await step(() => store.fault('backup-file-copied'));
        files[key] = await fileHash(resolve(destination, key), lease);
      }
    }
    assert.equal(await step(() => digest(store)), databaseDigest, 'Database changed during backup');
    await step(() => store.fault('backup-before-manifest'));
    const manifest = {
      contract: 'consistent-backup-v1',
      databaseDigest,
      files: Object.fromEntries(Object.entries(files).sort()),
    };
    await write(resolve(destination, 'manifest.pending'), jsonBytes(manifest), lease);
    await verifyInventory(destination, 'manifest.pending', lease);
    await step(() =>
      rename(resolve(destination, 'manifest.pending'), resolve(destination, 'manifest.json')),
    );
    await step(() => sync(destination));
    return manifest;
  });
}
async function verifyInventory(directory: string, marker: string, lease?: GateLease) {
  lease?.check();
  const all = await filesUnder(directory);
  assert.ok(all[marker]);
  const manifest = BackupSchema.parse(JSON.parse(await readFile(all[marker], 'utf8')));
  assert.deepEqual(
    Object.keys(all)
      .filter((k) => k !== marker)
      .sort(),
    Object.keys(manifest.files).sort(),
  );
  for (const [key, ref] of Object.entries(manifest.files)) {
    assert.ok(
      key === 'database.dump' ||
        /^assets\/(objects\/[a-f0-9]{64}|builds\/[a-f0-9]{64}\/[A-Za-z0-9.-]+)$/.test(key),
    );
    const path = all[key];
    assert.ok(path);
    assert.deepEqual(await fileHash(path, lease), ref);
  }
  return { manifest, files: all };
}
export async function verifyBackup(directory: string) {
  return verifyInventory(directory, 'manifest.json');
}
/** Requires an empty database and an absent asset root; never resets or overwrites an environment. */
export async function restore(store: Persistence, directory: string, pgBin: string) {
  const verified = await verifyBackup(directory);
  return store.gate.pause(async (lease) => {
    const step = <T>(operation: () => Promise<T>) => checked(lease, operation);
    const tables: unknown = await store.db
      .$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    assert.ok(Array.isArray(tables) && tables.length === 0, 'Restore database must be empty');
    await step(() => mkdir(resolve(store.storage.root, '..'), { recursive: true, mode: 0o700 }));
    await step(() => mkdir(store.storage.root, { mode: 0o700 }));
    for (const [key, source] of Object.entries(verified.files))
      if (key.startsWith('assets/')) {
        const target = resolve(store.storage.root, key.slice(7));
        await copy(source, target, lease);
        assert.deepEqual(await fileHash(target, lease), verified.manifest.files[key]);
        await step(() => chmod(target, 0o444));
        await step(() => sync(target));
      }
    await step(() => sync(store.storage.root));
    await step(() => store.fault('restore-before-db'));
    // All immutable files are durable before the atomic database restore registers references.
    await command(
      resolve(pgBin, 'pg_restore'),
      [
        '--exit-on-error',
        '--single-transaction',
        '--no-owner',
        '--no-privileges',
        '--dbname',
        new URL(store.databaseUrl).pathname.slice(1),
        resolve(directory, 'database.dump'),
      ],
      store.databaseUrl,
      lease,
    );
    assert.equal(
      await step(() => verifyDatabase(store)),
      verified.manifest.databaseDigest,
      'Restored database differs',
    );
    return verified.manifest;
  });
}
