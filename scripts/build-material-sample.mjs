import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rename, rm, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  RawSource,
  RgbaImage,
  buildProcessedAsset,
  hashBytes,
  fingerprint,
  styleProfile,
} from '@tileset/asset-core';
import {
  processShoreline,
  shorelineParameters,
  shorelineRecipe,
} from '@tileset/material-processing';
import { decodeSource, encodePng, codecRuntime, PNG_POLICY } from '@tileset/image-adapter';
import { PROFILE } from '../dist/src/profile.js';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain', '--untracked-files=all'))
  throw new Error('Commit the candidate before publishing the material sample.');
const commit = git('rev-parse', 'HEAD');
const fixtureBytes = await readFile(
  'packages/material-processing/tests/fixtures/fixed-shoreline.json',
);
const art = JSON.parse(fixtureBytes);
const provenance = {
  origin: 'manual',
  author: 'Independent literal fixture',
  license: 'CC0-1.0',
  toolVersion: 'hand-selected-pixels-v1',
  parents: [],
};
const files = {},
  sources = [],
  measurements = [];
const entries = [
  { id: 'grass', revision: 3, role: 'grass', pixels: art.grass },
  ...art.water.map((pixels, i) => ({ id: `water-${i}`, revision: 1, role: 'water', pixels })),
  { id: 'mask', revision: 2, role: 'static-mask', pixels: art.mask },
  { id: 'bank-detail', revision: 1, role: 'bank-overlay', pixels: art.overlay },
];
for (const entry of entries) {
  const image = new RgbaImage({
    width: art.width,
    height: art.height,
    data: new Uint8Array(entry.pixels.flat()),
  });
  const bytes = await encodePng(image);
  const result = await decodeSource(
    new RawSource({
      id: entry.id,
      revision: entry.revision,
      role: entry.role,
      density: art.density,
      encoding: 'png',
      bytes,
      provenance,
    }),
  );
  if (result.status !== 'validated')
    throw new Error(`Material sample source was rejected: ${result.diagnostic.code}`);
  sources.push(result.source);
  measurements.push({ source: entry.id, ...result.measurement });
  files[`sources/${entry.id}.png`] = bytes;
}
const style = styleProfile('style', 2, {
  logicalPixelScale: art.density,
  palette: art.palette,
  lighting: 'flat',
  outline: 'dark',
});
const parameters = shorelineParameters('shore-parameters', 4, {
  geometry: {
    width: art.width,
    height: art.height,
    tileWidth: 2,
    tileHeight: 2,
    regions: [
      { name: 'bank-edge', role: 'edge', rect: { x: 0, y: 0, width: 2, height: 2 } },
      { name: 'interior', role: 'center', rect: { x: 2, y: 0, width: 2, height: 2 } },
    ],
  },
  animation: {
    frameCount: 3,
    sequence: [0, 1, 2, 1],
    durations: [30, 30, 30, 30],
    timebase: 'updates',
    loop: true,
  },
  composition: 'linear-srgb-source-over',
  mask: 'white-static-bank',
});
const recipe = shorelineRecipe('shore', 5, {
  version: 'fixed-shoreline-v1',
  grass: sources[0].ref,
  water: sources.slice(1, 4).map((s) => s.ref),
  staticMask: sources[4].ref,
  bankOverlay: sources[5].ref,
  style: style.ref,
  parameters: parameters.ref,
});
const built = buildProcessedAsset(
  processShoreline({ recipe, sources, style, parameters }),
  'processed-sample',
);
const { groundImage, staticMaskImage, frames, ...ir } = built.ir;
files['processed/ground.png'] = await encodePng(groundImage);
files['processed/static-mask.png'] = await encodePng(staticMaskImage);
for (let i = 0; i < frames.length; i++)
  files[`processed/water-${i}.png`] = await encodePng(frames[i]);
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
files['tile-ir.json'] = json({
  ...ir,
  groundImage: { pixelHash: groundImage.pixelHash, file: 'processed/ground.png' },
  staticMaskImage: { pixelHash: staticMaskImage.pixelHash, file: 'processed/static-mask.png' },
  frames: frames.map((p, i) => ({ pixelHash: p.pixelHash, file: `processed/water-${i}.png` })),
});
files['revisions.json'] = json({
  style,
  parameters,
  recipe,
  sources: sources.map((s) => ({
    ref: s.ref,
    encodedHash: s.raw.encodedHash,
    pixelHash: s.image.pixelHash,
    validationHash: s.validationHash,
    provenance: s.raw.provenance,
  })),
});
const hashes = Object.fromEntries(
  Object.keys(files)
    .sort()
    .map((path) => [path, hashBytes(files[path])]),
);
const identity = {
  commit,
  profile: PROFILE,
  pixelContract: PROFILE.pixelContract,
  domainContract: 'asset-revision-v1',
  irContract: 'tile-ir-v1',
  processing: 'fixed-shoreline-v1',
  node: process.versions.node,
  lockSha256: hashBytes(await readFile('pnpm-lock.yaml')),
  fixtureSha256: hashBytes(fixtureBytes),
  codec: await codecRuntime(),
  artifactHash: built.artifactHash,
  files: hashes,
};
const buildId = `step03-material-${commit.slice(0, 12)}-${fingerprint(identity).slice(0, 16)}`;
const base = resolve('artifacts'),
  destination = resolve(base, buildId),
  stage = resolve(base, `.stage-${buildId}-${process.pid}`),
  lock = resolve(base, `.lock-${buildId}`);
await mkdir(base, { recursive: true });
await mkdir(lock);
try {
  try {
    await lstat(destination);
    throw new Error('Immutable material build already exists.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(stage);
  for (const [path, bytes] of Object.entries(files)) {
    const target = resolve(stage, path);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx' });
  }
  await writeFile(
    resolve(stage, 'manifest.json'),
    json({
      buildId,
      ...identity,
      state: built.state,
      targetCompilation: built.targetCompilation,
      policy: PNG_POLICY,
      validation: {
        automatedChecks: 'EXTERNAL_EVIDENCE_REQUIRED',
        independentReview: 'NOT_EXECUTED',
        nativeMZHost: 'NOT_EXECUTED',
        visualConfirmation: 'NOT_EXECUTED',
      },
      note: 'Tiny hand-authored generic processing sample; no MZ numeric IDs, fragment, slot allocation or target atlas.',
    }),
    { flag: 'wx' },
  );
  await rename(stage, destination);
  console.log(
    JSON.stringify(
      {
        buildId,
        commit,
        manifestSha256: hashBytes(await readFile(resolve(destination, 'manifest.json'))),
        files: hashes,
        measurements,
      },
      null,
      2,
    ),
  );
} finally {
  await rm(stage, { recursive: true, force: true });
  await rm(lock, { recursive: true, force: true });
}
