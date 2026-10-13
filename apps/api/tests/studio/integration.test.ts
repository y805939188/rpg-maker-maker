import { pathToFileURL } from 'node:url';
import { decodeSource } from '@tileset/image-adapter';
import { runIsolated } from '../../../../packages/image-adapter/src/isolation.js';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { deflateSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { request as rawRequest } from 'node:http';
import {
  readFile,
  mkdir,
  writeFile,
  readdir,
  cp,
  rename,
  symlink,
  realpath,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { backup, restore, Persistence, RefSchema } from '@tileset/persistence';
import { hashBytes } from '@tileset/asset-core';
import { decodeAtlas, verifyExportFiles } from '@tileset/pack-export';
import { createApplication } from '../../src/app.js';
import { loadEnvironment, parseConfig } from '../../src/config.js';
import { StudioService } from '../../src/studio-service.js';
import type { Resources } from '../../src/studio-service.js';
loadEnvironment();
const root = resolve('.local/step07/tests', randomUUID()),
  pgBin = process.env['TILESET_PG_BIN'] ?? '/opt/homebrew/opt/postgresql@14/bin';
let running: Awaited<ReturnType<typeof createApplication>>,
  url: string,
  p: string,
  source: Buffer,
  service: StudioService,
  resources: Resources;
let admin: PrismaClient;
const dbNames: string[] = [];
let failOpen = false;
let failWrite = false,
  stallCodec = false;
async function newDatabase() {
  const name = 'tileset_step07_' + randomUUID().replaceAll('-', '');
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  dbNames.push(name);
  const u = new URL(process.env['DATABASE_URL']!);
  u.pathname = '/' + name;
  return u.href;
}
async function r(path: string, body?: unknown) {
  const response = await fetch(
    url + path,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          headers: {
            Origin: url,
            'X-Tileset-Client': 'local-v1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok) throw Error(JSON.stringify(data));
  return data;
}
async function upload(bytes: Uint8Array, component = 'grass', extra = '', density = 2) {
  return fetch(`${url}/api/projects/${p}/sources/${component}/upload?density=${density}${extra}`, {
    method: 'POST',
    headers: { Origin: url, 'X-Tileset-Client': 'local-v1', 'Content-Type': 'image/png' },
    body: new Uint8Array(bytes).buffer,
  });
}

function crc(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const v of bytes) {
    c ^= v;
    for (let n = 0; n < 8; n++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name: string, payload: Uint8Array) {
  const body = Buffer.concat([Buffer.from(name), Buffer.from(payload)]),
    out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(payload.length);
  body.copy(out, 4);
  out.writeUInt32BE(crc(body), out.length - 4);
  return out;
}
function pngWire(width = 96, height = 144, type = 6, meta?: string, hidden = false) {
  const h = Buffer.alloc(13);
  h.writeUInt32BE(width);
  h.writeUInt32BE(height, 4);
  h[8] = 8;
  h[9] = type;
  const rows: Buffer[] = [];
  let random = 123;
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    for (let x = 0; x < width; x++) {
      random = (random * 1664525 + 1013904223) >>> 0;
      row.set(
        [random & 255, (random >>> 8) & 255, (random >>> 16) & 255, hidden ? 0 : 255],
        1 + x * 4,
      );
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', h),
    ...(meta
      ? [
          chunk(
            meta,
            meta === 'acTL'
              ? new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0])
              : new Uint8Array([97, 0, 98]),
          ),
        ]
      : []),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 0 })),
    chunk('IEND', new Uint8Array()),
  ]);
}
async function state() {
  return r(`/api/projects/${p}/studio`);
}
async function recipe() {
  const s = await state();
  const selected = Object.fromEntries(
    ['grass', 'water-0', 'water-1', 'water-2', 'mask', 'overlay'].map((c) => [
      c,
      s.sources.find((x: { component: string }) => x.component === c).id,
    ]),
  );
  await r(`/api/projects/${p}/recipe`, {
    expectedRevision: s.revision,
    sources: selected,
    style: 'component-palette',
  });
}
async function build(mode = 'update') {
  const s = await state(),
    j = await r(`/api/projects/${p}/builds`, {
      recipeId: s.recipes.find((x: { current: boolean }) => x.current).id,
      expectedRevision: s.revision,
      mode,
    });
  for (let n = 0; n < 120; n++) {
    await new Promise((a) => setTimeout(a, 100));
    const next = await state(),
      job = next.jobs.find((x: { id: string }) => x.id === j.id);
    if (['COMPLETED', 'FAILED'].includes(job.state)) return { job, state: next };
  }
  throw Error('Build did not finish');
}
async function record(name: string, value: unknown) {
  await writeFile(resolve(root, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}
beforeAll(async () => {
  await mkdir(root, { recursive: true });
  admin = new PrismaClient({ datasources: { db: { url: process.env['DATABASE_URL']! } } });
  const database = await newDatabase();
  const migrate = spawnSync(
    'pnpm',
    ['--filter', '@tileset/api', 'exec', 'prisma', 'migrate', 'deploy'],
    { env: { ...process.env, DATABASE_URL: database }, encoding: 'utf8' },
  );
  expect(migrate.status).toBe(0);
  resources = JSON.parse(
    await readFile('apps/api/dist/resources/studio.json', 'utf8'),
  ) as Resources;
  const config = parseConfig({
    ...process.env,
    DATABASE_URL: database,
    API_PORT: process.env['STEP07_TEST_API_PORT'] ?? '4377',
    NODE_ENV: 'test',
  });
  service = new StudioService(
    config,
    resources,
    resolve(root, 'assets'),
    async (point) => {
      if (failOpen && point === 'source-file-opened') {
        failOpen = false;
        throw Error('TEST_OWNED_SOURCE_OPEN_FAILURE');
      }
      if (failWrite && point === 'file-partial') {
        failWrite = false;
        throw Error('TEST_OWNED_UPLOAD_WRITE_FAILURE');
      }
    },
    async (raw, signal) => {
      const stall = stallCodec;
      stallCodec = false;
      const result = await decodeSource(raw, signal);
      if (stall && result.status === 'validated')
        await runIsolated(
          { operation: 'runtime' },
          pathToFileURL(resolve('packages/image-adapter/tests/fixtures/stalled-worker.mjs')),
          undefined,
          signal,
        );
      return result;
    },
  );
  await service.recover();
  running = await createApplication(config, service);
  await running.app.listen(config.API_PORT, '127.0.0.1');
  url = `http://127.0.0.1:${config.API_PORT}`;
  p = (await r('/api/projects', { name: 'HTTP安全与恢复-' + randomUUID() })).id;
  source = Buffer.from(resources.presets.art.sources[0]!.png, 'base64');
  await record('ownership', {
    root,
    databases: dbNames,
    port: new URL(database).port,
    api: config.API_PORT,
    owner: 'step07 formal author tests',
    sourceContext: resources.context,
  });
});
afterAll(async () => {
  await running?.close();
  await admin?.$disconnect();
});
it('real HTTP validates container/pixels/density/fields/CSRF/budgets before asset publication', async () => {
  const before = await service.store.db.assetRevision.count();
  for (const bytes of [Buffer.from('not a PNG'), source.map((v, i) => (i === 50 ? v ^ 1 : v))]) {
    const response = await upload(bytes);
    expect(response.status).toBe(422);
    expect((await response.json()).error.diagnostic.code).toBeTruthy();
  }
  for (const bytes of [
    pngWire(96, 144, 2),
    pngWire(96, 144, 6, 'tEXt'),
    pngWire(96, 144, 6, 'acTL'),
    pngWire(769, 576),
    pngWire(96, 144, 6, undefined, true),
    pngWire(),
  ]) {
    const result = await upload(bytes);
    expect(result.status).toBe(422);
    expect((await result.json()).error.diagnostic.code).toBeTruthy();
  }
  const large = pngWire(768, 576);
  expect((await upload(large, 'grass', '', 1)).status).toBe(422);
  expect(service.lastDecodedMeasurement?.rssBytes).toBeGreaterThan(0);
  await record('largest-http-decoded-plane', {
    encodedBytes: large.length,
    width: 768,
    height: 576,
    decodedBytes: 768 * 576 * 4,
    targetSourceDimensionResult: 'REJECTED_96x144_REQUIRED',
    measurement: service.lastDecodedMeasurement,
    jsHeapMiB: 128,
    osNativeRssHardLimit: false,
  });
  expect((await upload(source, 'grass', '&serverPath=/tmp/private')).status).toBe(400);
  expect((await upload(new Uint8Array(4 * 1024 * 1024 + 1))).status).toBe(413);
  expect(
    (
      await fetch(`${url}/api/projects/${p}/sources/grass/upload?density=2`, {
        method: 'POST',
        headers: {
          Origin: 'https://external.invalid',
          'X-Tileset-Client': 'local-v1',
          'Content-Type': 'image/png',
        },
        body: new Uint8Array(source).buffer,
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(`${url}/api/projects/${p}/sources/grass/upload?density=2`, {
        method: 'POST',
        headers: { Origin: url, 'Content-Type': 'image/png' },
        body: new Uint8Array(source).buffer,
      })
    ).status,
  ).toBe(403);
  expect(await service.store.db.assetRevision.count()).toBe(before);
  expect(await service.store.storage.inventory()).toMatchObject({ stages: [] });
  failOpen = true;
  expect((await upload(source)).status).toBe(422);
  expect((await service.store.storage.inventory()).stages).toEqual([]);
  failWrite = true;
  expect((await upload(source)).status).toBe(422);
  expect((await service.store.storage.inventory()).stages).toEqual([]);
  expect(await service.store.db.assetRevision.count()).toBe(before);
  const valid = await upload(source);
  expect(valid.status).toBe(201);
  const measurement = (await valid.json()).measurement;
  expect(measurement.rssBytes).toBeGreaterThan(0);
  expect(measurement.durationMs).toBeLessThan(5000);
  await record('upload-native-measurement', measurement);
  expect((await fetch(`${url}/api/projects/${p}/sources/${'0'.repeat(64)}/png`)).status).toBe(404);
});
it('real slow/aborted/concurrent/chunked HTTP requests release slots and leave no partial asset', async () => {
  const raw = () =>
    rawRequest(`${url}/api/projects/${p}/sources/water-0/upload?density=2`, {
      method: 'POST',
      headers: { Origin: url, 'X-Tileset-Client': 'local-v1', 'Content-Type': 'image/png' },
    });
  const before = await service.store.db.assetRevision.count();
  let first: ReturnType<typeof raw>;
  const slow = new Promise<number>((accept, reject) => {
    first = raw();
    first.on('error', reject);
    first.on('response', (res) => {
      res.resume();
      res.on('end', () => accept(res.statusCode!));
    });
    first.write(source.subarray(0, 8));
  });
  await new Promise((a) => setTimeout(a, 100));
  expect((await upload(source)).status).toBe(429);
  expect(await slow).toBe(408);
  first!.destroy();
  const cancelled = raw();
  cancelled.on('error', () => {});
  cancelled.write(source.subarray(0, 10));
  await new Promise((a) => setTimeout(a, 100));
  cancelled.destroy();
  await new Promise((a) => setTimeout(a, 200));
  const chunked = await new Promise<number>((accept, reject) => {
    const req = raw();
    req.on('error', reject);
    req.on('response', (res) => {
      res.resume();
      res.on('end', () => accept(res.statusCode!));
    });
    req.end(new Uint8Array(4 * 1024 * 1024 + 1));
  });
  expect(chunked).toBe(413);
  expect(await service.store.db.assetRevision.count()).toBe(before);
  expect((await service.store.storage.inventory()).stages).toEqual([]);
  expect((await upload(source)).status).toBe(201);
  await record('ingress-failures', {
    slow: 408,
    busy: 429,
    cancelled: 'connection closed',
    chunked: 413,
    sourceRowsBefore: before,
    stages: [],
  });
});
it('actual HTTP codec deadline and cancellation stop owned child work before slot reuse', async () => {
  const before = await service.store.db.assetRevision.count();
  stallCodec = true;
  const started = performance.now(),
    timeout = await upload(source);
  expect(timeout.status).toBe(422);
  const body = await timeout.json();
  expect(body.error.diagnostic.code).toBe('CODEC_TIMEOUT');
  expect(performance.now() - started).toBeGreaterThan(4900);
  stallCodec = true;
  const req = rawRequest(`${url}/api/projects/${p}/sources/grass/upload?density=2`, {
    method: 'POST',
    headers: { Origin: url, 'X-Tileset-Client': 'local-v1', 'Content-Type': 'image/png' },
  });
  req.on('error', () => {});
  req.end(source);
  await new Promise((r) => setTimeout(r, 250));
  req.destroy();
  await new Promise((r) => setTimeout(r, 300));
  expect(await service.store.db.assetRevision.count()).toBe(before);
  expect((await service.store.storage.inventory()).stages).toEqual([]);
  expect((await upload(source)).status).toBe(201);
  await record('http-codec-deadline-cancel', {
    deadline: 5000,
    timeoutCode: body.error.diagnostic.code,
    cancelAfterMs: 250,
    sourceRowsUnchanged: before,
    subsequentUpload: 201,
    stages: [],
    fixture:
      'actual isolated stalled worker only through test factory; production uses unchanged decoder',
  });
});
it('actual Export/history/current, paired updates, retired slots and failed-build protection survive clean backup restore and rebuild', async () => {
  await r(`/api/projects/${p}/preset`, { family: 'art' });
  await recipe();
  const first = await build();
  expect(first.job.state).toBe('COMPLETED');
  const firstExport = await service.store.readExport(first.job.buildId);
  expect(Object.keys(firstExport.files)).toHaveLength(8);
  expect(firstExport.manifest.identity.profileHash).toBe(
    '48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793',
  );
  await r(`/api/projects/${p}/preset`, { family: 'diagnostic' });
  await recipe();
  expect((await state()).needsRebuild).toBe(true);
  const second = await build();
  expect(second.job.state).toBe('COMPLETED');
  const changed = await service.store.readExport(second.job.buildId);
  expect(changed.files['A1.png']).not.toEqual(firstExport.files['A1.png']);
  expect(changed.input.plan.placements.map((p) => p.kind)).toEqual(
    firstExport.input.plan.placements.map((p) => p.kind),
  );
  const retired = await build('retire-and-add');
  expect(retired.job.state).toBe('COMPLETED');
  const re = await service.store.readExport(retired.job.buildId);
  expect(re.input.snapshot.slots.filter((s) => s.state === 'RETIRED')).toHaveLength(2);
  expect((await service.store.readExport(first.job.buildId)).files['A1.png']).toEqual(
    firstExport.files['A1.png'],
  );
  const failed = await build('retire-and-add');
  expect(failed.job.state).toBe('FAILED');
  expect(failed.state.successfulBuildId).toBe(retired.job.buildId);
  expect(failed.job.diagnostic.code).toBe('CAPACITY');
  const png = await r(`/api/projects/${p}/builds/${first.job.buildId}/preview?scene=edges`);
  expect(png.descriptor.buildId).toBe(first.job.buildId);
  expect(png.qa.artifactMz).toBe('NOT_EXECUTED');
  const zipResponse = await fetch(`${url}/api/projects/${p}/builds/${first.job.buildId}/download`),
    zip = new Uint8Array(await zipResponse.arrayBuffer());
  expect(zipResponse.status).toBe(200);
  expect(hashBytes(zip)).toBe(zipResponse.headers.get('x-content-sha256'));
  await verifyExportFiles(firstExport.files);
  const snap = await service.store.projectSnapshot(p),
    pack = await service.store.db.pack.findFirstOrThrow({ where: { projectId: p } });
  const late = await service.store.prepareBuild(p, pack.id, snap.id, [], resources.context);
  const current = await state(),
    adopted = await service.store.db.projectSnapshot.findUniqueOrThrow({ where: { id: snap.id } });
  await service.store.adopt(p, current.revision, RefSchema.array().parse(adopted.adoption));
  const archived = await service.store.publish(late);
  expect(archived.publication).toBe('HISTORICAL');
  await service.createExport(p, archived.id);
  expect(Object.keys((await service.export(p, archived.id)).files)).toHaveLength(8);
  expect((await state()).successfulBuildId).toBe(retired.job.buildId);
  const backupDir = resolve(root, 'backup');
  const b = await backup(service.store, backupDir, pgBin);
  const unsafeUrl = await newDatabase(),
    unsafeParent = resolve(root, 'restore-linked-parent'),
    outsideRestore = resolve(root, 'restore-outside');
  await mkdir(outsideRestore);
  await symlink(outsideRestore, unsafeParent);
  const unsafeRestore = new Persistence(
    unsafeUrl,
    resolve(unsafeParent, 'assets'),
    resources.profile,
  );
  try {
    await expect(restore(unsafeRestore, backupDir, pgBin)).rejects.toThrow('symbolic link');
    expect(await readdir(outsideRestore)).toEqual([]);
    expect(
      await unsafeRestore.db
        .$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
    ).toEqual([]);
    await record('r1-rejected-restore-parent', {
      database: new URL(unsafeUrl).pathname,
      declaredRoot: unsafeRestore.storage.root,
      outsideRestore,
      targetEmpty: true,
      schemaEmpty: true,
      outcome: 'REJECTED_BEFORE_FILE_OR_DB_RESTORE',
    });
  } finally {
    await unsafeRestore.close();
  }
  const restoreUrl = await newDatabase(),
    restoreRoot = resolve(root, 'restore-assets');
  const restored = new Persistence(restoreUrl, restoreRoot, resources.profile);
  await restore(restored, backupDir, pgBin);
  const restoreService = new StudioService(
    parseConfig({ ...process.env, DATABASE_URL: restoreUrl, API_PORT: '4377' }),
    resources,
    restoreRoot,
  );
  await restoreService.recover();
  const restoredState = await restoreService.state(p);
  expect(restoredState.sources.length).toBe(current.sources.length);
  expect(restoredState.recipes.length).toBe(current.recipes.length);
  expect(restoredState.successfulBuildId).toBe(retired.job.buildId);
  expect((await restored.readExport(first.job.buildId)).files['A1.png']).toEqual(
    firstExport.files['A1.png'],
  );
  const head = await restored.projectSnapshot(p),
    next = await restored.prepareBuild(p, pack.id, head.id, [], resources.context),
    bundle = JSON.parse(new TextDecoder().decode(next.files['bundle.json']!));
  const { assembleExport } = await import('@tileset/pack-export');
  const exported = await assembleExport(resources.profile, bundle, resources.context);
  await restored.publish(next, exported.files);
  expect((await restored.readExport(next.id)).atlases.a1.pixelHash).toBe(re.atlases.a1.pixelHash);
  await record('integrated-restoration', {
    first: first.job.buildId,
    second: second.job.buildId,
    retired: retired.job.buildId,
    failed: failed.job,
    late: archived.id,
    latePublication: archived.publication,
    exportManifest: firstExport.row.manifestSha,
    zipSha: hashBytes(zip),
    backup: b,
    restoreDatabase: new URL(restoreUrl).pathname,
    restoreRoot,
    rebuilt: next.id,
    restoredState,
  });
  await restored.close();
  await restoreService.close();
  expect((await decodeAtlas(firstExport.files['A1.png']!)).pixelHash).toBe(
    firstExport.atlases.a1.pixelHash,
  );
  expect(await readdir(resolve(root, 'assets', 'stage'))).toEqual([]);
});

it('equal PNG content across different component IDs does not misclassify an uploaded new revision', async () => {
  const bytes = Buffer.from(resources.presets.diagnostic.sources[2]!.png, 'base64');
  const zero = await upload(bytes, 'water-0', '', 1),
    one = await upload(bytes, 'water-1', '', 1);
  expect(zero.status).toBe(201);
  expect(one.status).toBe(201);
  const id0 = (await zero.json()).id,
    id1 = (await one.json()).id;
  await recipe();
  const after = await state();
  expect(after.sources.find((s: { id: string }) => s.id === id0).component).toBe('water-0');
  expect(after.sources.find((s: { id: string }) => s.id === id1).component).toBe('water-1');
  const current = after.recipes.find((r: { current: boolean }) => r.current);
  expect(current.components['water-0']).toBe(id0);
  expect(current.components['water-1']).toBe(id1);
  await record('component-identity-equal-bytes', {
    zero: id0,
    one: id1,
    pngSha: hashBytes(bytes),
    classifications: ['water-0', 'water-1'],
    content: 'same PNG/provenance/role/density content hash; logical IDs remain distinct',
  });
});
it('existing step06 native sources, recipe and four-file Build gain a real standard export without changing history', async () => {
  const legacy = await service.store.createProject('Legacy06-' + randomUUID()),
    saved = await service.store.saveArchives(legacy.id, [resources.presets.art]);
  const row = saved.records[0]!,
    snapshot = await service.store.adopt(legacy.id, 0, row.built.ir.dependencies),
    pack = await service.store.createPack(legacy.id, 'legacy-pack');
  const prepared = await service.store.prepareBuild(
      legacy.id,
      pack.id,
      snapshot.id,
      [
        {
          operation: 'put',
          logicalId: 'legacy-grass',
          revision: 1,
          fragmentHash: row.ground.contentHash,
          groundId: null,
        },
        {
          operation: 'put',
          logicalId: 'legacy-water',
          revision: 1,
          fragmentHash: row.water.contentHash,
          groundId: 'legacy-grass',
        },
      ],
      resources.context,
    ),
    built = await service.store.publish(prepared);
  const original = await service.store.readBuild(built.id),
    state = await service.state(legacy.id);
  expect(state.sources).toHaveLength(6);
  expect(Object.keys(state.recipes[0]!.components)).toHaveLength(6);
  const getBefore = await fetch(
    `${url}/api/projects/${legacy.id}/builds/${built.id}/preview?scene=edges`,
  );
  expect(getBefore.status).toBe(409);
  expect(
    await service.store.db.finalExport.findUnique({ where: { buildId: built.id } }),
  ).toBeNull();
  const blocked = await fetch(`${url}/api/projects/${legacy.id}/builds/${built.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  expect(blocked.status).toBe(403);
  await r(`/api/projects/${legacy.id}/builds/${built.id}/export`, {});
  const exported = await service.export(legacy.id, built.id);
  expect(Object.keys(exported.files)).toHaveLength(8);
  expect(exported.files['A1.png']).toEqual(original.files['A1.png']);
  expect((await service.store.readBuild(built.id)).files['manifest.json']).toEqual(
    original.files['manifest.json'],
  );
  expect((await service.state(legacy.id)).successfulBuildId).toBe(built.id);
  await record('legacy06-standard-conversion', {
    project: legacy.id,
    build: built.id,
    internalManifestSha: hashBytes(original.files['manifest.json']!),
    exportManifestSha: exported.row.manifestSha,
    profileHash: exported.row.profileHash,
    sources: state.sources,
    recipe: state.recipes[0],
  });
});

it('a real deferred PostgreSQL job-completion rejection rolls back Build, Export and current together', async () => {
  const before = await state(),
    buildCount = await service.store.db.build.count({ where: { projectId: p } }),
    exportCount = await service.store.db.finalExport.count();
  await service.store.db.$executeRawUnsafe(
    `CREATE FUNCTION step07_reject_completion() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW."state"='COMPLETED' THEN RAISE EXCEPTION 'STEP07_DEFERRED_COMPLETION_REJECTED'; END IF; RETURN NEW; END$$`,
  );
  await service.store.db.$executeRawUnsafe(
    `CREATE CONSTRAINT TRIGGER step07_owned_deferred_completion AFTER UPDATE ON "StudioJob" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION step07_reject_completion()`,
  );
  let failed: Awaited<ReturnType<typeof build>>;
  try {
    failed = await build();
    expect(failed.job.state).toBe('FAILED');
    expect(failed.state.successfulBuildId).toBe(before.successfulBuildId);
    expect(await service.store.db.build.count({ where: { projectId: p } })).toBe(buildCount);
    expect(await service.store.db.finalExport.count()).toBe(exportCount);
  } finally {
    await service.store.db.$executeRawUnsafe(
      `DROP TRIGGER step07_owned_deferred_completion ON "StudioJob"`,
    );
    await service.store.db.$executeRawUnsafe(`DROP FUNCTION step07_reject_completion()`);
  }
  const recovered = await build();
  expect(recovered.job.state).toBe('COMPLETED');
  const verified = await service.store.readExport(recovered.job.buildId);
  expect(verified.build.record.id).toBe(recovered.job.buildId);
  await record('atomic-job-export-cas', {
    failure: failed!.job,
    lastSuccess: before.successfulBuildId,
    buildCountBefore: buildCount,
    exportCountBefore: exportCount,
    recovery: recovered.job,
    manifestSha: verified.row.manifestSha,
    orphanPolicy: 'complete immutable files retained; no failed DB references or pointer switch',
  });
});

it('public source/A1 and standard JSON/ZIP reads reject replaced ancestors and preserve legal history and rebuilds', async () => {
  const priorProject = p;
  p = (await r('/api/projects', { name: 'R1存储边界-' + randomUUID() })).id;
  const observations: unknown[] = [];
  const assets = service.store.storage.root;
  async function readControl(path: string) {
    const response = await fetch(url + path),
      bytes = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, sha256: hashBytes(bytes), bytes: bytes.length };
  }
  async function inject(path: string, label: string, run: () => Promise<void>) {
    const outside = resolve(root, 'r1-' + label + '-outside'),
      saved = path + '-r1-preserved';
    await cp(path, outside, { recursive: true });
    await rename(path, saved);
    await symlink(outside, path);
    try {
      await run();
    } finally {
      await rename(path, resolve(root, 'r1-' + label + '-retained-link'));
      await rename(saved, path);
    }
  }
  try {
    await r(`/api/projects/${p}/preset`, { family: 'art' });
    await recipe();
    const first = await build();
    expect(first.job.state).toBe('COMPLETED');
    const saved = await state(),
      source = saved.sources[0],
      buildId = first.job.buildId;
    const endpoints = {
      source: `/api/projects/${p}/sources/${source.id}/png`,
      a1: `/api/projects/${p}/builds/${buildId}/files/A1.png`,
      manifest: `/api/projects/${p}/builds/${buildId}/files/manifest.json`,
      zip: `/api/projects/${p}/builds/${buildId}/download`,
      preview: `/api/projects/${p}/builds/${buildId}/preview?scene=edges`,
      processed: `/api/projects/${p}/recipes/${saved.recipes.find((r: { current: boolean }) => r.current).id}/processed?frame=0`,
    };
    const normal: Record<string, Awaited<ReturnType<typeof readControl>>> = {};
    for (const [name, path] of Object.entries(endpoints)) normal[name] = await readControl(path);
    for (const control of Object.values(normal)) expect(control.status).toBe(200);
    observations.push({ phase: 'ordinary', endpoints, normal });
    for (const part of ['objects', 'root', 'builds']) {
      const path = part === 'root' ? assets : resolve(assets, part);
      await inject(path, part, async () => {
        const names = part === 'builds' ? ['zip', 'preview'] : Object.keys(endpoints);
        const statuses: number[] = [];
        for (const name of names) {
          const result = await readControl(endpoints[name as keyof typeof endpoints]);
          observations.push({ phase: part + '-symlink', endpoint: name, result });
          statuses.push(result.status);
        }
        expect(statuses).toEqual(names.map(() => 422));
        await expect(service.store.readBuild(buildId)).rejects.toThrow();
        await expect(service.store.readExport(buildId)).rejects.toThrow();
        await expect(
          backup(service.store, resolve(root, 'r1-rejected-backup-' + part), pgBin),
        ).rejects.toThrow();
        expect(
          (await service.store.db.project.findUniqueOrThrow({ where: { id: p } }))
            .successfulBuildId,
        ).toBe(buildId);
      });
      expect(await readControl(endpoints.source)).toEqual(normal['source']);
      expect(await readControl(endpoints.a1)).toEqual(normal['a1']);
      expect(await readControl(endpoints.zip)).toEqual(normal['zip']);
    }
    const row = await service.store.db.assetRevision.findUniqueOrThrow({
        where: { id: source.id },
      }),
      sourceFile = await service.store.db.fileObject.findUniqueOrThrow({
        where: { sha256: row.sourceSha! },
      }),
      exported = await service.store.db.finalExport.findUniqueOrThrow({ where: { buildId } }),
      refs = exported.files as Record<string, { key: string }>;
    for (const [label, key, endpoint] of [
      ['source-leaf', sourceFile.key, endpoints.source],
      ['a1-leaf', refs['A1.png']!.key, endpoints.a1],
    ]) {
      await inject(resolve(assets, key!), label!, async () => {
        observations.push({ phase: label, realPath: await realpath(resolve(assets, key!)) });
        expect((await readControl(endpoint!)).status).toBe(422);
      });
      expect((await readControl(endpoint!)).status).toBe(200);
    }
    const rebuilt = await build();
    expect(rebuilt.job.state).toBe('COMPLETED');
    expect((await state()).successfulBuildId).toBe(rebuilt.job.buildId);
    expect(await readControl(endpoints.zip)).toEqual(normal['zip']);
    observations.push({
      phase: 'restored-and-rebuilt',
      oldBuild: buildId,
      current: rebuilt.job.buildId,
      oldZip: normal['zip'],
    });
  } finally {
    await record('r1-public-storage-boundaries', {
      sourceContext: resources.context,
      project: p,
      observations,
      policy:
        'Observable cooperative-path changes rejected; no arbitrary-secret disclosure or HTTP symlink creation claimed.',
    });
    p = priorProject;
  }
});
