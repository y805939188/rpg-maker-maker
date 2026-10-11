import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { compileFixedPrototype } from '../src/compiler.js';
import { decodePng, encodePng } from '../src/pixels.js';
import { PROFILE } from '../src/profile.js';
import { git, sha256 } from './io.js';

if (git('status','--porcelain','--untracked-files=all')) {
  throw new Error('Commit candidate sources/fixtures first: build evidence requires a clean Git tree');
}
const commit = git('rev-parse','HEAD');
const fileBytes: Record<string,Buffer> = {};
const sourceHashes: Record<string,string> = {};
for (const family of ['diagnostic','art']) {
  const names = [`${family}-ground.png`,...[0,1,2].map(f=>`${family}-water-${f}.png`)];
  const loaded = await Promise.all(names.map(async name => {
    const bytes = await readFile(`tests/fixtures/${name}`);
    return { name, hash:sha256(bytes), pixels:await decodePng(bytes) };
  }));
  // Promise completion order must not affect serialized identity/key order.
  for (const source of loaded) sourceHashes[source.name] = source.hash;
  const sources = loaded.map(source=>source.pixels);
  const { a1,a2 } = compileFixedPrototype(sources[0]!,sources.slice(1));
  fileBytes[`${family}_A1.png`] = await encodePng(a1);
  fileBytes[`${family}_A2.png`] = await encodePng(a2);
}
for (const name of ['art-static-bank-mask.png','provenance.json']) {
  sourceHashes[name] = sha256(await readFile(`tests/fixtures/${name}`));
}
const identity = { commit, profile: PROFILE, pixelContract: PROFILE.pixelContract,
  compiler: 'fixed-prototype-v1', sources: sourceHashes,
  lockSha256: sha256(await readFile('pnpm-lock.yaml')), node: process.versions.node,
  encoder: sharp.versions,
  files: Object.fromEntries(Object.entries(fileBytes).map(([name,bytes])=>[name,sha256(bytes)])),
};
const id = `step01-${sha256(JSON.stringify(identity)).slice(0,20)}`;
const manifest = { buildId:id, ...identity, validation: {
  structural: 'STRUCTURAL_PASS', nativeOracle: 'NOT_EXECUTED',
  editorDrawing: 'NOT_EXECUTED', gameRuntime: 'NOT_EXECUTED', visual: 'NOT_EXECUTED',
  independentReview: 'NOT_EXECUTED', userApproval: 'NOT_EXECUTED',
}, note: 'Later evidence is external to this immutable manifest; fixed diagnostic placement, not production Pack Assembly.' };
const base = resolve('artifacts');
await mkdir(base,{ recursive:true });
const stage = resolve(base,`.stage-${id}-${process.pid}`);
const destination = resolve(base,id);
const lock = resolve(base,`.lock-${id}`);
await mkdir(lock); // serialize publication of this immutable identity
await mkdir(stage); // exclusive staging dir
try {
  try {
    await lstat(destination);
    throw new Error(`Immutable build already exists: ${destination}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  for (const [name,bytes] of Object.entries(fileBytes)) await writeFile(resolve(stage,name),bytes,{ flag:'wx' });
  await writeFile(resolve(stage,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{ flag:'wx' });
  // One same-filesystem directory rename publishes the complete experiment.
  await rename(stage,destination);
  console.log(JSON.stringify({ buildId:id,path:destination,manifestSha256:sha256(await readFile(resolve(destination,'manifest.json'))),files:identity.files },null,2));
} finally {
  await rm(stage,{ recursive:true,force:true });
  await rm(lock,{ recursive:true,force:true });
}
