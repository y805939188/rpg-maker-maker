import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PROFILE } from '../src/profile.js';
import { decodePng } from '../src/pixels.js';
import { sha256 } from './io.js';

// Both fixed experimental tilesets reference A1 and A2; no production Pack schema.
export const REQUIRED_ATLASES = ['diagnostic_A1.png','diagnostic_A2.png','art_A1.png','art_A2.png'] as const;
type AtlasName = typeof REQUIRED_ATLASES[number];
const HASH = /^[a-f0-9]{64}$/;
function record(value: unknown, label: string): Record<string,unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string,unknown>;
}

/** All required inputs are validated and cached before prepare touches its destination. */
export async function preflightPrototypeBuild(build: string) {
  const manifestBytes = await readFile(resolve(build,'manifest.json'));
  const m = record(JSON.parse(manifestBytes.toString('utf8')) as unknown,'Manifest');
  assert.deepEqual(m['profile'],PROFILE,'Manifest Target Profile differs from the fixed candidate');
  if (typeof m['commit'] !== 'string' || !/^[a-f0-9]{40}$/.test(m['commit'])) throw new Error('Manifest commit must be a full Git SHA');
  if (typeof m['buildId'] !== 'string' || !/^step01-[a-f0-9]{20}$/.test(m['buildId'])) throw new Error('Invalid Manifest buildId');
  const files = record(m['files'],'Manifest.files');
  for (const name of REQUIRED_ATLASES) {
    if (!Object.hasOwn(files,name)) throw new Error(`Manifest missing required atlas: ${name}`);
    if (typeof files[name] !== 'string' || !HASH.test(files[name])) throw new Error(`Invalid SHA-256 for required atlas: ${name}`);
  }
  for (const name of Object.keys(files)) {
    if (!(REQUIRED_ATLASES as readonly string[]).includes(name)) throw new Error(`Unexpected atlas in Manifest.files: ${name}`);
  }
  assert.equal(m['pixelContract'],PROFILE.pixelContract,'Manifest pixel contract mismatch');
  assert.equal(m['compiler'],'fixed-prototype-v1','Unsupported prototype compiler');
  for (const field of ['sources','encoder']) record(m[field],`Manifest.${field}`);
  if (typeof m['lockSha256'] !== 'string' || !HASH.test(m['lockSha256']) || typeof m['node'] !== 'string') {
    throw new Error('Manifest build environment identity is invalid');
  }
  // Exactly the existing fixed-prototype-v1 identity field order, without changing build IDs.
  const identity = {commit:m['commit'],profile:m['profile'],pixelContract:m['pixelContract'],
    compiler:m['compiler'],sources:m['sources'],lockSha256:m['lockSha256'],node:m['node'],
    encoder:m['encoder'],files};
  assert.equal(m['buildId'],`step01-${sha256(JSON.stringify(identity)).slice(0,20)}`,'Manifest buildId does not match its identity');
  const atlases = {} as Record<AtlasName,Buffer>;
  const hashes = {} as Record<AtlasName,string>;
  for (const name of REQUIRED_ATLASES) {
    let bytes: Buffer;
    try { bytes = await readFile(resolve(build,name)); }
    catch (cause) { throw new Error(`Cannot read required atlas: ${name}`,{cause}); }
    assert.equal(sha256(bytes),files[name],`Required atlas SHA-256 mismatch: ${name}`);
    try {
      const pixels = await decodePng(bytes);
      assert.deepEqual([pixels.width,pixels.height],[PROFILE.atlas.width,PROFILE.atlas.height],'Expected 768×576 atlas');
    } catch (cause) { throw new Error(`Invalid required atlas: ${name}`,{cause}); }
    atlases[name] = bytes;
    hashes[name] = files[name] as string;
  }
  return {manifest:{buildId:m['buildId'],commit:m['commit'],profile:PROFILE,files:hashes},
    manifestSha256:sha256(manifestBytes),atlases};
}
