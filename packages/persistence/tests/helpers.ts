import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fingerprint } from '@tileset/asset-core';
import { codecRuntime } from '@tileset/image-adapter';
import { Persistence } from '@tileset/persistence';
import type { FaultHook } from '@tileset/persistence';
import { PROFILE } from '../../../src/profile.js';
import { makeCompilerFixture } from '../../../scripts/step04-fixture.js';
import { archiveFixture } from '../../../scripts/pack-export.js';
import { variantFixture, fragmentsFor, pairOperations } from '../../../scripts/step05-fixture.js';
try {
  process.loadEnvFile(resolve('.env'));
} catch (e) {
  if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT' && process.env['DATABASE_URL']))
    throw e;
}
export const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw Error('Step06 tests require real dedicated PostgreSQL');
export const pgBin = process.env['TILESET_PG_BIN'] ?? '/opt/homebrew/opt/postgresql@14/bin';
export const runRoot = resolve('.local/step06/tests', randomUUID());
export const context = {
  commit: 'a'.repeat(40),
  lockSha256: 'b'.repeat(64),
  node: process.versions.node,
  codec: await codecRuntime(),
};
export async function setup(fault?: FaultHook, environment?: { url: string; assetRoot: string }) {
  const root = resolve(runRoot, randomUUID());
  await mkdir(root, { recursive: true });
  const store = new Persistence(
      databaseUrl!,
      resolve(process.env['TILESET_ASSET_ROOT'] ?? '.local/assets'),
      PROFILE,
      fault,
    ),
    project = await store.createProject('step06-' + randomUUID());
  const base = await makeCompilerFixture('art'),
    a = await variantFixture(base, 'persist-a', 1, false),
    b = await variantFixture(base, 'persist-b', 1, true);
  await store.saveArchives(project.id, [archiveFixture(a), archiveFixture(b)]);
  const adopted = await store.adopt(project.id, 0, a.built.ir.dependencies),
    pack = await store.createPack(project.id, 'persistence-pack');
  return {
    root,
    store,
    project,
    a,
    b,
    adopted,
    pack,
    operations: pairOperations('a', 1, fragmentsFor(a)),
  };
}
export async function evidence(name: string, value: unknown) {
  await mkdir(runRoot, { recursive: true });
  await writeFile(resolve(runRoot, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}
export function snapshot(configurationVersion = 'mock-config-v1') {
  return {
    contractVersion: 'task-snapshot-v1',
    configurationVersion,
    taskKind: 'IMAGE_GENERATE',
    model: {
      provider: 'mock',
      modelId: 'synthetic-image',
      modelVersion: '1',
      adapterVersion: 'mock-provider-v1',
      parameters: { nested: { quality: 1 } },
    },
    prompts: {
      main: {
        id: 'synthetic-main',
        revision: '1',
        content: 'Synthetic Mock template, no real prompt composition.',
      },
      task: {
        id: 'synthetic-task',
        revision: '1',
        content: 'Synthetic result for recovery testing.',
      },
      supplemental: '',
    },
    targetProfile: { id: PROFILE.id, version: PROFILE.version },
    style: { id: 'synthetic-style', revision: '1', parameters: { palette: ['green'] } },
    structuredParameters: { nested: { density: 1 } },
    references: [],
  };
}
export { PROFILE, pairOperations, fragmentsFor, archiveFixture, variantFixture, fingerprint };
