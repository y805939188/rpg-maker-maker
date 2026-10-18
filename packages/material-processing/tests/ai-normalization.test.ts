import { it, expect } from 'vitest';
import { RgbaImage, validateDensity } from '@tileset/asset-core';
import { normalizeAiTerrain, prepareReferenceV2, protectStaticRegion } from '../src/index.js';
function image(width: number, height: number, flat = false) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      data.set(
        [flat ? 85 : (x * 7) % 256, flat ? 85 : (y * 5) % 256, 170, 255],
        (y * width + x) * 4,
      );
  return new RgbaImage({ width, height, data });
}
it('explicit conversion preserves ratio by square crop, quantizes/tiles at density2, owns source pixels and deterministically produces coherent three frames', () => {
  const source = image(96, 144),
    before = source.pixelHash,
    a = normalizeAiTerrain(source, 'water'),
    b = normalizeAiTerrain(source, 'water');
  expect(a.descriptor.rect).toEqual({ x: 0, y: 24, width: 96, height: 96 });
  expect(a.descriptor.outputPixelHashes).toEqual(b.descriptor.outputPixelHashes);
  expect(a.frames).toHaveLength(3);
  expect(new Set(a.frames.map((f) => f.pixelHash)).size).toBe(3);
  expect(a.descriptor.changedFraction).toBeGreaterThanOrEqual(0.01);
  for (const frame of a.frames) {
    expect([frame.width, frame.height]).toEqual([96, 144]);
    validateDensity(frame, 2);
    const colors = new Set<string>();
    const bytes = frame.bytes();
    for (let i = 0; i < bytes.length; i += 4) colors.add(Array.from(bytes.slice(i, i + 3)).join());
    expect(colors.size).toBeLessThanOrEqual(64);
    bytes.fill(0);
  }
  expect(source.pixelHash).toBe(before);
  const prepared = prepareReferenceV2(source);
  expect([prepared.width, prepared.height]).toEqual([256, 256]);
  expect(source.pixelHash).toBe(before);
});
it('rejects low detail static water, undersize/alpha invalid inputs; fixed bank is identical across all derived states', () => {
  expect(() => normalizeAiTerrain(image(256, 256, true), 'water')).toThrow('less than 1%');
  expect(() => normalizeAiTerrain(image(24, 24), 'grass')).toThrow('too small');
  const input = image(48, 48).pixels();
  input.data.set([0, 0, 0, 0], 0);
  expect(() => normalizeAiTerrain(new RgbaImage(input), 'grass')).toThrow('opaque');
  const frames = normalizeAiTerrain(image(256, 256), 'water').frames,
    bank = normalizeAiTerrain(image(256, 256), 'grass').frames[0]!;
  const maskBytes = new Uint8Array(96 * 144 * 4);
  for (let i = 0; i < 96 * 144; i++)
    maskBytes.set(i < 96 * 20 ? [255, 255, 255, 255] : [0, 0, 0, 255], i * 4);
  const mask = new RgbaImage({ width: 96, height: 144, data: maskBytes }),
    protectedFrames = frames.map((f) => protectStaticRegion(bank, f, mask));
  expect(
    protectedFrames.every((f) =>
      Buffer.from(f.bytes().slice(0, 96 * 20 * 4)).equals(
        Buffer.from(bank.bytes().slice(0, 96 * 20 * 4)),
      ),
    ),
  ).toBe(true);
});
