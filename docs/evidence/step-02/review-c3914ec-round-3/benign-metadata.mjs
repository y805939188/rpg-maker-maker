import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { decodePng } from '@tileset/prototype';
import { preflightPrototypeBuild } from '../../../dist/scripts/prototype-input.js';

const output = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(output, '../../..');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const original = await readFile(resolve(root, 'artifacts/step01-c512ed0c899ac99d4694/diagnostic_A1.png'));
// Valid, harmless little-endian TIFF EXIF: one Orientation=1 SHORT tag; no malformed offsets.
const exif = Buffer.from('49492a0008000000010012010300010000000100000000000000', 'hex');
const type = Buffer.from('eXIf');
const chunk = Buffer.alloc(exif.length + 12);
chunk.writeUInt32BE(exif.length, 0);
type.copy(chunk, 4);
exif.copy(chunk, 8);
let crc = 0xffffffff;
for (const value of chunk.subarray(4, 8 + exif.length)) {
  crc ^= value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
}
chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + exif.length);
const png = Buffer.concat([original.subarray(0, 33), chunk, original.subarray(33)]);
const metadata = await sharp(png).metadata();
const decoded = await decodePng(png);
const clean = await decodePng(original);
const fixture = resolve(output, 'benign-metadata-build');
await mkdir(fixture);
const manifest = JSON.parse(await readFile(resolve(root, 'artifacts/step01-c512ed0c899ac99d4694/manifest.json'), 'utf8'));
manifest.files['diagnostic_A1.png'] = sha(png);
const identity = {
  commit: manifest.commit, profile: manifest.profile, pixelContract: manifest.pixelContract,
  compiler: manifest.compiler, sources: manifest.sources, lockSha256: manifest.lockSha256,
  node: manifest.node, encoder: manifest.encoder, files: manifest.files,
};
manifest.buildId = 'step01-' + sha(JSON.stringify(identity)).slice(0, 20);
manifest.note = 'Owned benign review fixture, valid Orientation=1 EXIF only; not an official build.';
for (const name of Object.keys(manifest.files)) {
  await writeFile(resolve(fixture, name), name === 'diagnostic_A1.png' ? png : await readFile(resolve(root, 'artifacts/step01-c512ed0c899ac99d4694', name)), { flag: 'wx' });
}
await writeFile(resolve(fixture, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
const accepted = await preflightPrototypeBuild(fixture);
const report = {
  sourceCommit: manifest.commit,
  sharp: sharp.versions,
  benignFixture: 'Valid RGBA8 PNG with one valid Orientation=1 eXIf/TIFF metadata chunk; no exploit/crash payload.',
  inputSha256: sha(png),
  metadataHasExif: Boolean(metadata.exif),
  metadataExifLength: metadata.exif?.length ?? 0,
  exportedDecodePngAccepted: true,
  decodedPixelsUnchanged: Buffer.from(decoded.data).equals(Buffer.from(clean.data)),
  preflightSuppliedBuildAccepted: Boolean(accepted),
  suppliedFixtureBuildId: accepted.manifest.buildId,
  realMZProjectCreated: false,
  implication: 'Public decoder and prepare:mz preflight can accept user-supplied, self-consistent build PNG metadata; hashes prove integrity, not producer trust.',
};
await writeFile(resolve(output, 'benign-metadata-reachability.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
