import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fingerprint, hashBytes } from '@tileset/asset-core';
import { codecRuntime, encodePng, PNG_POLICY } from '@tileset/image-adapter';
import { COMPILER_VERSION, compileFragment, FRAGMENT_CONTRACT, TARGET } from '@tileset/mz-compiler';
import { makeCompilerFixture } from '../dist/scripts/step04-fixture.js';
import { fixedDiagnostic } from '../dist/scripts/step04-diagnostic.js';
import { PROFILE } from '../dist/src/profile.js';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain', '--untracked-files=all'))
  throw Error('Commit the candidate before publishing step04.');
const commit = git('rev-parse', 'HEAD'),
  files = {},
  inputs = {},
  originalSources = {};
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
for (const family of ['art', 'diagnostic']) {
  const f = await makeCompilerFixture(family),
    ir = f.built.ir;
  for (const [name, bytes] of Object.entries(f.files)) files[`${family}/${name}`] = bytes;
  Object.assign(originalSources, f.originalHashes);
  files[`${family}/revisions.json`] = json({
    style: f.style,
    parameters: f.parameters,
    recipe: f.recipe,
    sources: f.sources.map((s, i) => ({
      file: Object.keys(f.files)[i],
      ref: s.ref,
      validationHash: s.validationHash,
      descriptor: {
        id: s.ref.id,
        revision: s.ref.revision,
        role: s.raw.role,
        density: s.raw.density,
        provenance: s.raw.provenance,
      },
    })),
  });
  const ground = compileFragment(ir, 'a2-ground'),
    water = compileFragment(ir, 'a1-water');
  const atlases = fixedDiagnostic(ground, water);
  files[`${family}/A1.png`] = await encodePng(atlases.a1);
  files[`${family}/A2.png`] = await encodePng(atlases.a2);
  files[`${family}/ground.fragment.png`] = await encodePng(ground.image);
  files[`${family}/water.fragment.png`] = await encodePng(water.image);
  const describe = (fragment, file) => ({
    ...fragment,
    image: {
      width: fragment.image.width,
      height: fragment.image.height,
      pixelHash: fragment.image.pixelHash,
      file,
    },
  });
  files[`${family}/fragments.json`] = json({
    ground: describe(ground, 'ground.fragment.png'),
    water: describe(water, 'water.fragment.png'),
  });
  files[`${family}/processed/ground.png`] = await encodePng(ir.groundImage);
  files[`${family}/processed/mask.png`] = await encodePng(ir.staticMaskImage);
  for (let i = 0; i < 3; i++)
    files[`${family}/processed/water-${i}.png`] = await encodePng(ir.frames[i]);
  files[`${family}/tile-ir.json`] = json({
    ...ir,
    groundImage: { pixelHash: ir.groundImage.pixelHash, file: 'processed/ground.png' },
    staticMaskImage: { pixelHash: ir.staticMaskImage.pixelHash, file: 'processed/mask.png' },
    frames: ir.frames.map((p, i) => ({ pixelHash: p.pixelHash, file: `processed/water-${i}.png` })),
  });
  inputs[family] = {
    irHash: ir.contentHash,
    groundFragment: ground.contentHash,
    waterFragment: water.contentHash,
  };
}
const hashes = Object.fromEntries(
  Object.keys(files)
    .sort()
    .map((p) => [p, hashBytes(files[p])]),
);
const identity = {
  commit,
  profile: PROFILE,
  target: TARGET,
  fragmentContract: FRAGMENT_CONTRACT,
  compiler: COMPILER_VERSION,
  node: process.versions.node,
  pnpm: '10.20.0',
  lockSha256: hashBytes(await readFile('pnpm-lock.yaml')),
  codec: await codecRuntime(),
  inputs,
  originalSources,
  files: hashes,
};
const buildId = `step04-mz-${commit.slice(0, 12)}-${fingerprint(identity).slice(0, 16)}`;
const base = resolve('artifacts'),
  destination = resolve(base, buildId),
  stage = resolve(base, `.stage-${buildId}-${process.pid}`),
  lock = resolve(base, `.lock-${buildId}`);
await mkdir(base, { recursive: true });
await mkdir(lock);
try {
  try {
    await lstat(destination);
    throw Error('Immutable step04 build already exists.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(stage);
  for (const [name, bytes] of Object.entries(files)) {
    const path = resolve(stage, name);
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, bytes, { flag: 'wx' });
  }
  await writeFile(
    resolve(stage, 'manifest.json'),
    json({
      buildId,
      identity,
      policy: PNG_POLICY,
      validation: {
        structural: 'STRUCTURAL_PASS',
        nativeOracle: 'EXTERNAL_EVIDENCE_REQUIRED',
        independentReview: 'NOT_EXECUTED_BY_DESIGN',
        editorDrawing: 'NOT_EXECUTED',
        gameRuntime: 'NOT_EXECUTED',
        visual: 'NOT_EXECUTED',
        userApproval: 'NOT_EXECUTED',
      },
      note: 'Single-material Compiler output in retained fixed diagnostic coordinates; no production Pack. Separate evidence cannot mutate this manifest.',
    }),
    { flag: 'wx' },
  );
  await rename(stage, destination);
  console.log(
    JSON.stringify(
      {
        buildId,
        path: destination,
        commit,
        manifestSha256: hashBytes(await readFile(resolve(destination, 'manifest.json'))),
        files: hashes,
      },
      null,
      2,
    ),
  );
} finally {
  await rm(stage, { recursive: true, force: true });
  await rm(lock, { recursive: true, force: true });
}
