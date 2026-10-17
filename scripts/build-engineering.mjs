import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { PROFILE } from '../dist/src/profile.js';

const root = process.cwd();
const step = process.argv[2] ?? 'step02';
if (!['step02', 'step03', 'step04', 'step05', 'step06', 'step07', 'step08'].includes(step))
  throw new Error('Unsupported engineering step.');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
if (git('status', '--porcelain', '--untracked-files=all'))
  throw new Error('Commit the candidate before publishing engineering artifacts.');
const files = {};
async function collect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) await collect(path);
    else if (item.isFile()) files[relative(root, path)] = await readFile(path);
    else throw new Error('Build tree contains a non-regular entry.');
  }
}
for (const directory of [
  'dist',
  'packages/contracts/dist',
  'packages/ai-gateway/dist',
  'packages/asset-core/dist',
  'packages/material-processing/dist',
  'packages/image-adapter/dist',
  'packages/mz-compiler/dist',
  ...(['step05', 'step06', 'step07', 'step08'].includes(step)
    ? ['packages/pack-assembly/dist']
    : []),
  ...(['step06', 'step07', 'step08'].includes(step)
    ? ['packages/persistence/dist', 'packages/local-executor/dist']
    : []),
  ...(['step07', 'step08'].includes(step) ? ['packages/pack-export/dist'] : []),
  'apps/api/dist',
  'apps/web/dist',
])
  await collect(resolve(root, directory));
if (['step06', 'step07', 'step08'].includes(step)) {
  files['apps/api/prisma/schema.prisma'] = await readFile('apps/api/prisma/schema.prisma');
  await collect(resolve(root, 'apps/api/prisma/migrations'));
}
const hashes = Object.fromEntries(
  Object.keys(files)
    .sort()
    .map((path) => [path, sha(files[path])]),
);
const identity = {
  commit: git('rev-parse', 'HEAD'),
  profile: PROFILE,
  pixelContract: PROFILE.pixelContract,
  httpContract: 'http-v1',
  taskContract: 'task-snapshot-v1',
  ...(step !== 'step02'
    ? {
        domainContract: 'asset-revision-v1',
        irContract: 'tile-ir-v1',
        processing: 'fixed-shoreline-v1',
      }
    : {}),
  ...(['step04', 'step05', 'step06', 'step07', 'step08'].includes(step)
    ? { fragmentContract: 'mz-compiled-fragment-v1', compiler: 'mz-single-material-v1' }
    : {}),
  ...(['step05', 'step06', 'step07', 'step08'].includes(step)
    ? { packContract: 'mz-pack-v1', layoutContract: 'mz-layout-v1', assembly: 'stable-slots-v1' }
    : {}),
  ...(['step06', 'step07', 'step08'].includes(step)
    ? {
        persistence: 'durable-store-v1',
        executor: 'local-executor-v1',
        schemaSha256: sha(await readFile('apps/api/prisma/schema.prisma')),
      }
    : {}),
  ...(['step07', 'step08'].includes(step)
    ? {
        studio: 'manual-studio-v1',
        standardExport: 'mz-pack-build-v1',
        pngHttpIngress: 'studio-png-http-v1',
        previewClock: 'fixed-logical-updates-v1',
      }
    : {}),
  ...(step === 'step08'
    ? {
        promptRegistry: 'terrain-source-main@1',
        modelConfiguration: 'terrain-models-20261017-v1',
        wavespeedSdk: '0.3.4',
        providerAdapter: 'wavespeed-adapter-v1',
      }
    : {}),
  node: process.versions.node,
  pnpm: '10.20.0',
  lockSha256: sha(await readFile('pnpm-lock.yaml')),
  files: hashes,
};
const buildId = `${step}-${identity.commit.slice(0, 12)}-${sha(JSON.stringify(identity)).slice(0, 16)}`;
const base = resolve(root, 'artifacts');
const destination = resolve(base, buildId);
const stage = resolve(base, `.stage-${buildId}-${process.pid}`);
const lock = resolve(base, `.lock-${buildId}`);
await mkdir(base, { recursive: true });
await mkdir(lock);
// Acquire only after exclusive mkdir; rename ends ownership of the stage path.
let stageOwned = false;
try {
  try {
    await lstat(destination);
    throw new Error('Immutable engineering build already exists.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(stage);
  stageOwned = true;
  for (const [path, bytes] of Object.entries(files)) {
    const target = resolve(stage, path);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx' });
  }
  const manifest = {
    buildId,
    ...identity,
    validation: {
      automatedChecks: 'EXTERNAL_EVIDENCE_REQUIRED',
      independentReview: 'NOT_EXECUTED',
      userApproval: 'NOT_EXECUTED',
      nativeMZHost: 'NOT_EXECUTED',
    },
    note: `${step} engineering baseline. MZ compatibility remains the step01 candidate and separate evidence. Requires pinned dependencies and generated Prisma client; ${['step07', 'step08'].includes(step) ? 'Manual PNG Studio, paired builds, actual standard exports, Pixi previews and QA; conservative Mock recovery; no real provider or AI workflow.' : step === 'step06' ? 'PostgreSQL/files publication, conservative Mock recovery and consistent backup; no real provider or Studio.' : step === 'step05' ? 'Compiler and stable Pack/Atlas; no database publication or provider runner.' : step === 'step04' ? 'single-material Compiler only; no production Pack or provider runner.' : 'no provider runner or formal target compiler/pack.'}`,
  };
  await writeFile(resolve(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {
    flag: 'wx',
  });
  await rename(stage, destination);
  stageOwned = false;
  console.log(
    JSON.stringify(
      {
        buildId,
        commit: identity.commit,
        manifestSha256: sha(await readFile(resolve(destination, 'manifest.json'))),
        files: hashes,
      },
      null,
      2,
    ),
  );
} finally {
  try {
    if (stageOwned) await rm(stage, { force: true, recursive: true });
  } finally {
    await rm(lock, { force: true, recursive: true });
  }
}
