import { it, expect } from 'vitest';
import { RgbaImage, validateDensity } from '@tileset/asset-core';
import {
  defaultTerrainRegion,
  normalizeAiRegion,
  sampleRegion,
  sharedPalette,
} from '../src/index.js';
import {
  connectEdges,
  paletteImage,
  sourceFrames,
} from '../../../scripts/step09-art-offline-core.js';
function image(offset = 0) {
  const data = new Uint8Array(256 * 256 * 4);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++)
      data.set(
        [(x * 7 + offset) % 256, (y * 3 + offset) % 256, (x + y) % 256, 255],
        (y * 256 + x) * 4,
      );
  return new RgbaImage({ width: 256, height: 256, data });
}
it('production A matches accepted offline pixel operations without any embedded candidate ROI, owns inputs, is deterministic and versioned', () => {
  const images = [image(), image(20)],
    rects = [
      { x: 88, y: 84, width: 64, height: 64 },
      { x: 184, y: 176, width: 64, height: 64 },
    ],
    before = images.map((i) => i.pixelHash);
  const samples = images.map((i, n) => sampleRegion(i, rects[n]!)),
    palette = sharedPalette(samples),
    inputs = images.map((i) => i.pixelHash);
  expect(palette.length).toBeLessThanOrEqual(64);
  for (const [n, component] of (['grass', 'water'] as const).entries()) {
    const result = normalizeAiRegion(images[n]!, component, rects[n]!, palette, inputs);
    const accepted = sourceFrames(
      paletteImage(
        connectEdges(paletteImage(samples[n]!, palette), 'copy-one-line').image,
        palette,
      ),
      component,
    );
    expect(result.frames.map((f) => f.pixelHash)).toEqual(accepted.map((f) => f.pixelHash));
    for (const f of result.frames) {
      expect([f.width, f.height]).toEqual([96, 144]);
      validateDensity(f, 2);
    }
    expect(result.descriptor.version).toBe('ai-region-adaptive-source-v2');
    expect(result.descriptor.paletteInputs).toEqual(inputs);
    expect(result.descriptor.rect).toEqual(rects[n]);
    if (component === 'water') {
      expect(result.descriptor.changedFraction).toBeGreaterThanOrEqual(0.01);
      expect(new Set(result.frames.map((f) => f.pixelHash)).size).toBe(3);
    }
  }
  expect(images.map((i) => i.pixelHash)).toEqual(before);
  expect(defaultTerrainRegion({ width: 96, height: 144 })).toEqual({
    x: 0,
    y: 24,
    width: 96,
    height: 96,
  });
});
it('rejects out of bounds, non-square, transparent regions and flat water without relaxing source contracts', () => {
  const original = image(),
    palette = sharedPalette([sampleRegion(original, { x: 0, y: 0, width: 64, height: 64 })]);
  for (const rect of [
    { x: 240, y: 0, width: 64, height: 64 },
    { x: 0, y: 0, width: 24, height: 25 },
    { x: 0, y: 0, width: 23, height: 23 },
  ])
    expect(() => normalizeAiRegion(original, 'water', rect, palette, [])).toThrow();
  const pixels = original.pixels();
  pixels.data[3] = 0;
  expect(() => sampleRegion(new RgbaImage(pixels), { x: 0, y: 0, width: 64, height: 64 })).toThrow(
    'Opaque',
  );
  expect(() =>
    normalizeAiRegion(original, 'water', defaultTerrainRegion(original), [[85, 85, 85]], []),
  ).toThrow('less than 1%');
});
