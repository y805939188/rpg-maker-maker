import { describe, expect, it } from 'vitest';
import { RawSource, RgbaImage } from '@tileset/asset-core';
import { deflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import {
  decodeSource,
  encodePng,
  codecRuntime,
  PNG_POLICY,
  readBoundedPng,
  ingestPng,
} from '../src/index.js';
import { inspectPng } from '../src/png-policy.js';
import { runIsolated } from '../src/isolation.js';
import { chunk, pngSample } from '../../../tests/png-samples.js';
import { art, fixture, provenance } from '../../material-processing/tests/fixture.js';
import { processShoreline, shorelineRecipe } from '../../material-processing/src/index.js';

function raw(
  bytes: Uint8Array,
  id = 'source',
  role: 'grass' | 'water' | 'static-mask' | 'bank-overlay' = 'grass',
) {
  return new RawSource({ id, revision: 1, role, density: 1, encoding: 'png', bytes, provenance });
}
function wire(width: number, height: number, pixels: readonly number[][]): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++)
    rows.push(Buffer.from([0, ...pixels.slice(y * width, (y + 1) * width).flat()]));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', new Uint8Array()),
  ]);
}
describe('bounded PNG ingress with actual isolated patched runtime', () => {
  it('decodes independent PNG wire bytes and deterministically encodes owned RGBA without metadata drift', async () => {
    const result = await decodeSource(raw(pngSample()));
    expect(result.status).toBe('validated');
    if (result.status !== 'validated') throw Error('fixture rejected');
    expect([...result.source.image.bytes()]).toEqual([1, 2, 3, 255]);
    expect(result.measurement.versions['sharp']).toBe('0.35.5');
    expect(result.measurement.versions['vips']).toBe('8.18.7');
    expect(result.measurement.rssBytes).toBeGreaterThan(0);
    expect(result.measurement.durationMs).toBeLessThan(PNG_POLICY.decodeDeadlineMs);
    const first = await encodePng(result.source.image),
      second = await encodePng(result.source.image);
    expect(first).toEqual(second);
    const roundtrip = await decodeSource(raw(first));
    if (roundtrip.status !== 'validated') throw Error('roundtrip rejected');
    expect([...roundtrip.source.image.bytes()]).toEqual([1, 2, 3, 255]);
    expect((await codecRuntime())['exif']).toBe('0.6.26');
  });
  it('feeds actual PNG Source→Validated→Compilable Tile IR and matches independent pixels', async () => {
    const input = fixture(),
      sources = [];
    const entries = [
      { id: 'grass', role: 'grass' as const, p: art.grass },
      ...art.water.map((p, i) => ({ id: `water-${i}`, role: 'water' as const, p })),
      { id: 'mask', role: 'static-mask' as const, p: art.mask },
      { id: 'bank-detail', role: 'bank-overlay' as const, p: art.overlay },
    ];
    for (const entry of entries) {
      const decoded = await decodeSource(
        raw(wire(art.width, art.height, entry.p), entry.id, entry.role),
      );
      if (decoded.status !== 'validated') throw Error('source rejected');
      sources.push(decoded.source);
    }
    const recipe = shorelineRecipe('shore', 6, {
      ...input.recipe.value,
      grass: sources[0]!.ref,
      water: sources.slice(1, 4).map((s) => s.ref),
      staticMask: sources[4]!.ref,
      bankOverlay: sources[5]!.ref,
    });
    const output = processShoreline({ ...input, recipe, sources });
    expect(output.ir.frames.map((p) => [...p.bytes()])).toEqual(art.expected.map((p) => p.flat()));
  });
  it('preserves transparent edges and partial alpha in PNG roundtrips', async () => {
    const pixels = [
      [0, 0, 0, 0],
      [12, 34, 56, 128],
      [12, 34, 56, 255],
    ];
    const output = await decodeSource(raw(wire(3, 1, pixels)));
    if (output.status !== 'validated') throw Error('alpha source rejected');
    expect([...output.source.image.bytes()]).toEqual(pixels.flat());
    const encoded = await encodePng(output.source.image),
      again = await decodeSource(raw(encoded));
    if (again.status !== 'validated') throw Error('alpha roundtrip rejected');
    expect(again.source.image.pixelHash).toBe(output.source.image.pixelHash);
  });
  it('requires explicit repair for EXIF orientation and compressed/text metadata before native parsing', async () => {
    for (const orientation of [1, 6]) {
      const exif = Buffer.from('49492a0008000000010012010300010000000100000000000000', 'hex');
      exif.writeUInt16LE(orientation, 18);
      const output = await decodeSource(raw(pngSample([chunk('eXIf', exif)])));
      expect(output).toMatchObject({
        status: 'repair-required',
        diagnostic: { code: 'METADATA_REPAIR' },
      });
    }
    const text = Buffer.concat([
      Buffer.from('Comment\0\0'),
      deflateSync(Buffer.from('ordinary fixture annotation')),
    ]);
    expect(await decodeSource(raw(pngSample([chunk('zTXt', text)])))).toMatchObject({
      status: 'repair-required',
      diagnostic: { code: 'METADATA_REPAIR' },
    });
  });
  it('rejects ICC/HDR/APNG/non-sRGB color, damaged CRC and non-PNG bytes with specific diagnostics', async () => {
    const gamma = Buffer.alloc(4);
    gamma.writeUInt32BE(100000);
    const crc = pngSample();
    crc[crc.length - 1] = crc[crc.length - 1]! ^ 1;
    const cases: [Uint8Array, string][] = [
      [pngSample([chunk('iCCP', Buffer.from('profile\0\0'))]), 'COLOR_POLICY'],
      [pngSample([chunk('cICP', Buffer.from([1, 16, 0, 1]))]), 'COLOR_POLICY'],
      [pngSample([chunk('gAMA', gamma)]), 'COLOR_POLICY'],
      [pngSample([], true), 'ANIMATED_PNG'],
      [crc, 'PNG_CRC'],
      [new Uint8Array([1, 2, 3]), 'PNG_SIGNATURE'],
    ];
    for (const [bytes, code] of cases)
      expect(await decodeSource(raw(bytes))).toMatchObject({
        status: 'rejected',
        diagnostic: { code },
      });
  });
  it('checks decoded pixels and metadata budgets from the container before native allocation', async () => {
    const png = pngSample(),
      header = Buffer.from(png.subarray(16, 29));
    header.writeUInt32BE(768 * 576 + 1, 0);
    const large = Buffer.concat([png.subarray(0, 8), chunk('IHDR', header), png.subarray(33)]);
    expect(await decodeSource(raw(large))).toMatchObject({
      status: 'rejected',
      diagnostic: { code: 'PIXEL_LIMIT' },
    });
    expect(
      await decodeSource(raw(pngSample([chunk('tEXt', Buffer.alloc(64 * 1024 + 1, 65))]))),
    ).toMatchObject({ status: 'rejected', diagnostic: { code: 'METADATA_LIMIT' } });
    expect(() => raw(new Uint8Array(PNG_POLICY.encodedBytes + 1))).toThrow('budget');
  });
  it('rejects hidden RGB, invalid density and non-RGBA8 representations rather than silently converting', async () => {
    expect(await decodeSource(raw(wire(1, 1, [[1, 0, 0, 0]])))).toMatchObject({
      status: 'rejected',
      diagnostic: { code: 'HIDDEN_RGB' },
    });
    const invalidDensity = new RawSource({
      id: 'source',
      revision: 1,
      role: 'grass',
      density: 2,
      encoding: 'png',
      bytes: pngSample(),
      provenance,
    });
    expect(await decodeSource(invalidDensity)).toMatchObject({
      status: 'rejected',
      diagnostic: { code: 'DENSITY' },
    });
    const png = pngSample(),
      header = Buffer.from(png.subarray(16, 29));
    header[9] = 2;
    expect(
      await decodeSource(
        raw(Buffer.concat([png.subarray(0, 8), chunk('IHDR', header), png.subarray(33)])),
      ),
    ).toMatchObject({ status: 'repair-required', diagnostic: { code: 'RGBA8_REQUIRED' } });
  });
  it('retains current authored PNGs and declared physical density without inferring logical scale', async () => {
    const bytes = await readFile('tests/fixtures/art-ground.png');
    expect(inspectPng(bytes)).toEqual({ width: 96, height: 144 });
    const input = new RawSource({
      id: 'art-ground',
      revision: 1,
      role: 'grass',
      density: 2,
      encoding: 'png',
      bytes,
      provenance,
    });
    const result = await decodeSource(input);
    expect(result.status).toBe('validated');
    if (result.status === 'validated') expect(result.source.raw.density).toBe(2);
  });
  it('measures the largest allowed normal plane in the actual child', async () => {
    const data = new Uint8Array(768 * 576 * 4);
    for (let i = 0; i < data.length; i += 4) data.set([1, 2, 3, 255], i);
    const encoded = await encodePng(new RgbaImage({ width: 768, height: 576, data }));
    const output = await decodeSource(raw(encoded));
    expect(output.status).toBe('validated');
    if (output.status === 'validated') {
      expect(output.source.image.bytes()).toEqual(data);
      expect(output.measurement.durationMs).toBeLessThan(5000);
      expect(output.measurement.rssBytes).toBeGreaterThan(0);
    }
  });
  it('admits one active codec job and rejects concurrent work without retaining a queue', async () => {
    const first = decodeSource(raw(pngSample()));
    const second = await decodeSource(raw(pngSample()));
    expect(second).toMatchObject({ status: 'rejected', diagnostic: { code: 'ADAPTER_BUSY' } });
    expect((await first).status).toBe('validated');
  });
  it('kills a timed-out ordinary worker and recovers the same process-wide slot', async () => {
    await expect(
      runIsolated(
        { operation: 'runtime' },
        new URL('./fixtures/stalled-worker.mjs', import.meta.url),
        100,
      ),
    ).rejects.toMatchObject({ code: 'CODEC_TIMEOUT' });
    expect((await codecRuntime())['sharp']).toBe('0.35.5');
  });
});
describe('pull ingress allocation and cancellation', () => {
  it('constructs a validated source through the bounded streaming entry', async () => {
    async function* stream() {
      yield pngSample();
    }
    const result = await ingestPng(stream(), {
      id: 'streamed',
      revision: 1,
      role: 'grass',
      density: 1,
      provenance,
    });
    expect(result.status).toBe('validated');
  });
  it('owns chunks and assembles only after a bounded complete read', async () => {
    const original = pngSample();
    async function* stream() {
      yield original.subarray(0, 33);
      yield original.subarray(33);
    }
    const bytes = await readBoundedPng(stream());
    original.fill(0);
    expect(inspectPng(bytes)).toEqual({ width: 1, height: 1 });
  });
  it('stops before storing an oversized producer chunk and closes the producer', async () => {
    let pulls = 0,
      closed = false;
    async function* stream() {
      try {
        pulls++;
        yield new Uint8Array(PNG_POLICY.encodedBytes + 1);
        pulls++;
        yield pngSample();
      } finally {
        closed = true;
      }
    }
    await expect(readBoundedPng(stream())).rejects.toMatchObject({ code: 'ENCODED_LIMIT' });
    expect(pulls).toBe(1);
    expect(closed).toBe(true);
  });
  it('bounds fragmented input and rejects empty chunks', async () => {
    async function* fragmented() {
      for (let i = 0; i < PNG_POLICY.chunks + 1; i++) yield new Uint8Array([1]);
    }
    await expect(readBoundedPng(fragmented())).rejects.toMatchObject({ code: 'READ_CHUNKS' });
    async function* empty() {
      yield new Uint8Array();
    }
    await expect(readBoundedPng(empty())).rejects.toMatchObject({ code: 'READ_CHUNK' });
  });
  it('rejects a concurrent read and times out a stalled producer without losing the slot', async () => {
    let closed = false;
    const stream: AsyncIterable<Uint8Array> = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise(() => {}),
        return: async () => {
          closed = true;
          return { done: true, value: undefined };
        },
      }),
    };
    const first = readBoundedPng(stream);
    await expect(readBoundedPng(stream)).rejects.toMatchObject({ code: 'READ_BUSY' });
    await expect(first).rejects.toMatchObject({ code: 'READ_TIMEOUT' });
    expect(closed).toBe(true);
    async function* valid() {
      yield pngSample();
    }
    expect(inspectPng(await readBoundedPng(valid()))).toEqual({ width: 1, height: 1 });
  });
});
