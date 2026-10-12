import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { decodePng, encodePng } from '../src/pixels.js';
import { compileFixedPrototype } from '../src/compiler.js';
import { preflightPrototypeBuild, REQUIRED_ATLASES } from '../scripts/prototype-input.js';
import { sha256 } from '../scripts/io.js';
import { chunk, pngSample } from './png-samples.js';

// Ordinary, valid little-endian TIFF EXIF: a single Orientation=1 SHORT tag.
// No malformed offsets, exploit or crash payload is used.
const harmlessExif = Buffer.from('49492a0008000000010012010300010000000100000000000000', 'hex');
const exifChunk = chunk('eXIf', harmlessExif);
const atlases: Record<string, Buffer> = {};
beforeAll(async () => {
  for (const family of ['diagnostic', 'art']) {
    const sources = await Promise.all(
      [`${family}-ground`, ...[0, 1, 2].map((frame) => `${family}-water-${frame}`)].map(
        async (name) => decodePng(await readFile(`tests/fixtures/${name}.png`)),
      ),
    );
    const { a1, a2 } = compileFixedPrototype(sources[0]!, sources.slice(1));
    atlases[`${family}_A1.png`] = await encodePng(a1);
    atlases[`${family}_A2.png`] = await encodePng(a2);
  }
});

describe('STEP02-R3-001: patched native codec at public PNG ingress', () => {
  it('loads the pinned Sharp and a vendor-patched libvips rather than merely checking package metadata', () => {
    expect(sharp.versions.sharp).toBe('0.35.5');
    const [major, minor, patch] = sharp.versions.vips!.split('.').map(Number);
    expect(major! > 8 || (major === 8 && (minor! > 18 || (minor === 18 && patch! >= 2)))).toBe(
      true,
    );
  });
  it('preserves source pixels while safely decoding valid RGBA8 PNG with harmless EXIF', async () => {
    const png = pngSample([exifChunk]);
    const metadata = await sharp(png).metadata();
    expect(metadata.exif).toBeDefined();
    expect(metadata.orientation).toBe(1);
    const decoded = await decodePng(png);
    expect([decoded.width, decoded.height]).toEqual([1, 1]);
    expect([...decoded.data]).toEqual([1, 2, 3, 255]);
  });
  it('exercises the built public package export and actual native runtime in production Node', () => {
    const png = pngSample([exifChunk]).toString('base64');
    const program = `import {decodePng} from '@tileset/prototype';
import sharp from 'sharp';
const bytes=Buffer.from(${JSON.stringify(png)},'base64');
const metadata=await sharp(bytes).metadata();
const decoded=await decodePng(bytes);
console.log(JSON.stringify({sharp:sharp.versions.sharp,vips:sharp.versions.vips,hasExif:Boolean(metadata.exif),width:decoded.width,height:decoded.height,pixels:[...decoded.data]}));`;
    const result = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '-e', program], { encoding: 'utf8' }),
    ) as {
      sharp: string;
      vips: string;
      hasExif: boolean;
      width: number;
      height: number;
      pixels: number[];
    };
    expect(result.sharp).toBe('0.35.5');
    expect(result.vips).toBe(sharp.versions.vips);
    expect(result.hasExif).toBe(true);
    expect([result.width, result.height, ...result.pixels]).toEqual([1, 1, 1, 2, 3, 255]);
  });
  it('validates a self-consistent supplied build containing harmless metadata using the patched decoder', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'tileset-benign-exif-'));
    try {
      const manifest = JSON.parse(
        await readFile(
          'docs/evidence/step-01/step01-ffc5300c7fb2cb94a48a/manifest.snapshot.json',
          'utf8',
        ),
      ) as Record<string, unknown> & { files: Record<string, string>; buildId: string };
      const original = atlases['diagnostic_A1.png']!;
      const withExif = Buffer.concat([original.subarray(0, 33), exifChunk, original.subarray(33)]);
      for (const name of REQUIRED_ATLASES) {
        const bytes = name === 'diagnostic_A1.png' ? withExif : atlases[name]!;
        manifest.files[name] = sha256(bytes);
        await writeFile(join(directory, name), bytes, { flag: 'wx' });
      }
      const {
        commit,
        profile,
        pixelContract,
        compiler,
        sources,
        lockSha256,
        node,
        encoder,
        files,
      } = manifest;
      manifest.buildId = `step01-${sha256(JSON.stringify({ commit, profile, pixelContract, compiler, sources, lockSha256, node, encoder, files })).slice(0, 20)}`;
      await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest), { flag: 'wx' });
      const accepted = await preflightPrototypeBuild(directory);
      expect(accepted.manifest.buildId).toBe(manifest.buildId);
      expect(accepted.atlases['diagnostic_A1.png']).toEqual(withExif);
      expect((await sharp(accepted.atlases['diagnostic_A1.png']).metadata()).exif).toBeDefined();
      expect((await decodePng(withExif)).data).toEqual((await decodePng(original)).data);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
