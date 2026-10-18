import { describe, expect, it } from 'vitest';
import { RgbaImage, validateDensity } from '@tileset/asset-core';
import { changedFraction, connectEdges, paletteImage, sampleRegion, sharedPalette, sourceFrames } from '../scripts/step09-art-offline-core.js';

function fixture() {
  const data = new Uint8Array(48 * 48 * 4);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) data.set([x * 5, y * 5, (x + y) * 2, 255], (y * 48 + x) * 4);
  return new RgbaImage({ width: 48, height: 48, data });
}
describe('isolated offline art experiment (no production default changes)', () => {
  it('requires explicit valid opaque square ROI and retains the original plane', () => {
    const image = fixture(), before = image.pixelHash;
    const crop = sampleRegion(image, { x: 12, y: 10, width: 24, height: 24 });
    expect(crop.bytes().slice(0, 4)).toEqual(new Uint8Array([60, 50, 44, 255]));
    expect(() => sampleRegion(image, { x: 0, y: 0, width: 24, height: 25 })).toThrow();
    expect(() => sampleRegion(image, { x: 30, y: 0, width: 24, height: 24 })).toThrow();
    const bad = image.pixels(); bad.data.set([0, 0, 0, 0], 0);
    expect(() => sampleRegion(new RgbaImage(bad), { x: 0, y: 0, width: 24, height: 24 })).toThrow('Opaque');
    expect(image.pixelHash).toBe(before);
  });
  it('learns one bounded deterministic shared palette and does not synthesize blue from green-only inputs', () => {
    const image = fixture(), base = sampleRegion(image, { x: 0, y: 0, width: 48, height: 48 });
    const a = sharedPalette([base, base], 16), b = sharedPalette([base, base], 16);
    expect(a).toEqual(b); expect(a.length).toBeLessThanOrEqual(16);
    const result = paletteImage(base, a), allowed = new Set(a.map(c => c.join(','))), bytes = result.bytes();
    for (let i = 0; i < bytes.length; i += 4) expect(allowed.has(Array.from(bytes.slice(i, i + 3)).join(','))).toBe(true);
    const green = new RgbaImage({ width: 24, height: 24, data: new Uint8Array(Array.from({ length: 576 }, () => [30, 150, 20, 255]).flat()) });
    expect(sharedPalette([green], 64)).toEqual([[30, 150, 20]]);
  });
  it('paired bands change only the declared border and preserve opposite edge equality after shared quantization', () => {
    const base = sampleRegion(fixture(), { x: 0, y: 0, width: 48, height: 48 }), original = base.bytes();
    const joined = connectEdges(base, 'paired-band'), bytes = joined.image.bytes();
    expect(joined.changedFraction).toBeLessThanOrEqual(1 - 16 * 16 / 576);
    for (let y = 4; y < 20; y++) for (let x = 4; x < 20; x++) {
      const i = (y * 24 + x) * 4; expect(bytes.slice(i, i + 4)).toEqual(original.slice(i, i + 4));
    }
    const quantized = paletteImage(joined.image, sharedPalette([base], 64)).bytes();
    for (let n = 0; n < 24; n++) {
      expect(quantized.slice(n * 24 * 4, n * 24 * 4 + 4)).toEqual(quantized.slice((n * 24 + 23) * 4, (n * 24 + 24) * 4));
      expect(quantized.slice(n * 4, n * 4 + 4)).toEqual(quantized.slice((23 * 24 + n) * 4, (23 * 24 + n) * 4 + 4));
    }
    expect(base.bytes()).toEqual(original);
  });
  it('derives owned three frames with the same palette and exact density2, with explicit solid-input limitation', () => {
    const base = sampleRegion(fixture(), { x: 0, y: 0, width: 48, height: 48 });
    const frames = sourceFrames(base, 'water');
    for (const frame of frames) { expect([frame.width, frame.height]).toEqual([96, 144]); validateDensity(frame, 2); }
    expect(changedFraction(frames[0]!, frames[1]!)).toBeGreaterThan(0.01);
    expect(sourceFrames(base, 'water').map(f => f.pixelHash)).toEqual(frames.map(f => f.pixelHash));
    frames[0]!.bytes().fill(0); expect(frames[1]!.pixelHash).toBe(sourceFrames(base, 'water')[1]!.pixelHash);
  });
});
