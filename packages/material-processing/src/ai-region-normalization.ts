import { RgbaImage, requireRule, validateDensity } from '@tileset/asset-core';
import type { Rect } from '@tileset/asset-core';
import { blank, crop, resizeNearest } from './index.js';
/** Production adoption of accepted A; no candidate-specific coordinates live here. */
export const AI_REGION_CONVERSION = Object.freeze({
  version: 'ai-region-adaptive-source-v2',
  sample: 'nearest-explicit-24-square',
  palette: 'shared-weighted-median-cut64-srgb-numeric-v1',
  periodicization: 'copy-opposite-edge-v1',
  density: 2,
  width: 96,
  height: 144,
  animation: 'shared-base-periodic-offset-0-1-2-logical-pixels',
});
export type Rgb = readonly [number, number, number];
type Swatch = { rgb: Rgb; count: number };

export function sampleRegion(image: RgbaImage, rect: Rect): RgbaImage {
  requireRule(
    image.bytes().every((v, i) => i % 4 !== 3 || v === 255),
    'AI_ALPHA',
    'Opaque input required.',
  );
  requireRule(
    rect.width === rect.height && rect.width >= 24,
    'AI_ROI',
    'Explicit square ROI of at least 24 pixels required.',
  );
  return resizeNearest(crop(image, rect), { width: 24, height: 24, method: 'nearest-explicit' });
}
const lex = (a: Rgb, b: Rgb) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const range = (box: Swatch[], c: number) =>
  Math.max(...box.map((p) => p.rgb[c]!)) - Math.min(...box.map((p) => p.rgb[c]!));
/** Deterministic weighted median-cut on the two selected source regions together. */
export function sharedPalette(images: readonly RgbaImage[], limit = 64): readonly Rgb[] {
  requireRule(
    Number.isInteger(limit) && limit >= 1 && limit <= 256,
    'AI_PALETTE',
    'Palette limit must be 1..256.',
  );
  requireRule(
    images.length >= 1 &&
      images.length <= 2 &&
      images.every((i) => i.width === 24 && i.height === 24),
    'AI_PALETTE',
    'Use at most two bounded 24x24 logical regions.',
  );
  const counts = new Map<string, Swatch>();
  for (const image of images) {
    const bytes = image.bytes();
    for (let i = 0; i < bytes.length; i += 4) {
      const rgb = [bytes[i]!, bytes[i + 1]!, bytes[i + 2]!] as const;
      const key = rgb.join(',');
      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { rgb, count: 1 });
    }
  }
  requireRule(counts.size > 0, 'AI_PALETTE', 'No color samples.');
  const boxes: Swatch[][] = [[...counts.values()].sort((a, b) => lex(a.rgb, b.rgb))];
  while (boxes.length < limit) {
    let chosen = -1,
      score = -1;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]!;
      if (box.length < 2) continue;
      const value =
        Math.max(range(box, 0), range(box, 1), range(box, 2)) *
        box.reduce((n, p) => n + p.count, 0);
      if (value > score) {
        chosen = i;
        score = value;
      }
    }
    if (chosen < 0) break;
    const box = boxes[chosen]!;
    let channel = 0;
    for (let c = 1; c < 3; c++) if (range(box, c) > range(box, channel)) channel = c;
    box.sort((a, b) => a.rgb[channel]! - b.rgb[channel]! || lex(a.rgb, b.rgb));
    const halfway = box.reduce((n, p) => n + p.count, 0) / 2;
    let sum = 0,
      split = 1;
    for (let i = 0; i < box.length - 1; i++) {
      sum += box[i]!.count;
      split = i + 1;
      if (sum >= halfway) break;
    }
    boxes.splice(chosen, 1, box.slice(0, split), box.slice(split));
  }
  const palette = boxes.map((box) => {
    const weight = box.reduce((n, p) => n + p.count, 0);
    return [0, 1, 2].map((c) =>
      Math.round(box.reduce((n, p) => n + p.rgb[c]! * p.count, 0) / weight),
    ) as [number, number, number];
  });
  return Object.freeze(
    [...new Map(palette.map((p) => [p.join(','), p])).values()]
      .sort(lex)
      .map((p) => Object.freeze(p)),
  );
}
export function paletteImage(image: RgbaImage, palette: readonly Rgb[]): RgbaImage {
  requireRule(
    palette.length > 0 && palette.length <= 256,
    'AI_PALETTE',
    'A bounded palette is required.',
  );
  const data = image.bytes();
  for (let i = 0; i < data.length; i += 4) {
    let best = palette[0]!,
      distance = Infinity;
    for (const color of palette) {
      const next = color.reduce((n, v, c) => n + (v - data[i + c]!) ** 2, 0);
      if (next < distance) {
        best = color;
        distance = next;
      }
    }
    data.set(best, i);
  }
  return new RgbaImage({ width: image.width, height: image.height, data });
}

export function defaultTerrainRegion(image: { width: number; height: number }): Rect {
  const edge = Math.min(image.width, image.height);
  return {
    x: Math.floor((image.width - edge) / 2),
    y: Math.floor((image.height - edge) / 2),
    width: edge,
    height: edge,
  };
}
export function normalizeAiRegion(
  image: RgbaImage,
  component: 'grass' | 'water',
  rect: Rect,
  palette: readonly Rgb[],
  paletteInputs: readonly string[],
) {
  requireRule(
    image.width >= 48 && image.height >= 48,
    'AI_INPUT_SIZE',
    'AI candidate is too small.',
  );
  const sample = sampleRegion(image, rect),
    base = paletteImage(sample, palette).bytes();
  for (let y = 0; y < 24; y++) base.set(base.slice(y * 24 * 4, y * 24 * 4 + 4), (y * 24 + 23) * 4);
  for (let x = 0; x < 24; x++) base.set(base.slice(x * 4, x * 4 + 4), (23 * 24 + x) * 4);
  const frames = (component === 'grass' ? [0] : [0, 1, 2]).map((phase) => {
    const out = blank(96, 144);
    for (let y = 0; y < 144; y++)
      for (let x = 0; x < 96; x++) {
        const sx = (Math.floor(x / 2) + phase) % 24,
          sy = Math.floor(y / 2) % 24;
        out.data.set(base.subarray((sy * 24 + sx) * 4, (sy * 24 + sx) * 4 + 4), (y * 96 + x) * 4);
      }
    const result = new RgbaImage(out);
    validateDensity(result, 2);
    return result;
  });
  let changed = 0;
  if (frames.length === 3) {
    const a = frames[0]!.bytes(),
      b = frames[1]!.bytes();
    for (let i = 0; i < a.length; i += 4)
      if ([0, 1, 2].some((c) => a[i + c] !== b[i + c])) changed++;
  }
  const changedFraction = changed / (96 * 144);
  requireRule(
    component !== 'water' || changedFraction >= 0.01,
    'AI_ANIMATION_STATIC',
    'Shared water base has less than 1% visible motion; reject or select another region/candidate.',
  );
  return {
    frames,
    descriptor: {
      ...AI_REGION_CONVERSION,
      input: { width: image.width, height: image.height, pixelHash: image.pixelHash },
      rect: { ...rect },
      selection: 'explicit-square-region',
      palette: palette.map((c) => [...c]),
      paletteInputs: [...paletteInputs],
      changedFraction,
      outputPixelHashes: frames.map((f) => f.pixelHash),
    },
  };
}
