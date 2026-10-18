import { RgbaImage, requireRule, validateDensity } from '@tileset/asset-core';
import type { Rect } from '@tileset/asset-core';
import { blank, crop, resizeNearest } from '@tileset/material-processing';

/** Isolated offline hypothesis. Not registered as a production conversion. */
export const ART_EXPERIMENT = Object.freeze({
  version: 'step09-art-roi-palette-periodic-v1-experiment',
  logicalSize: 24,
  density: 2,
  paletteLimit: 64,
  band: 4,
  frames: [0, 1, 2] as const,
});
export type Rgb = readonly [number, number, number];
type Swatch = { rgb: Rgb; count: number };

export function sampleRegion(image: RgbaImage, rect: Rect): RgbaImage {
  requireRule(image.bytes().every((v, i) => i % 4 !== 3 || v === 255), 'EXPERIMENT_ALPHA', 'Opaque input required.');
  requireRule(rect.width === rect.height && rect.width >= 24, 'EXPERIMENT_ROI', 'Explicit square ROI of at least 24 pixels required.');
  return resizeNearest(crop(image, rect), { width: 24, height: 24, method: 'nearest-explicit' });
}
const lex = (a: Rgb, b: Rgb) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const range = (box: Swatch[], c: number) => Math.max(...box.map(p => p.rgb[c]!)) - Math.min(...box.map(p => p.rgb[c]!));
/** Deterministic weighted median-cut on the two selected source regions together. */
export function sharedPalette(images: readonly RgbaImage[], limit = 64): readonly Rgb[] {
  requireRule(Number.isInteger(limit) && limit >= 1 && limit <= 256, 'EXPERIMENT_PALETTE', 'Palette limit must be 1..256.');
  requireRule(images.length >= 1 && images.length <= 2 && images.every(i => i.width === 24 && i.height === 24), 'EXPERIMENT_PALETTE', 'Use at most two bounded 24x24 logical regions.');
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
  requireRule(counts.size > 0, 'EXPERIMENT_PALETTE', 'No color samples.');
  const boxes: Swatch[][] = [[...counts.values()].sort((a, b) => lex(a.rgb, b.rgb))];
  while (boxes.length < limit) {
    let chosen = -1, score = -1;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]!;
      if (box.length < 2) continue;
      const value = Math.max(range(box, 0), range(box, 1), range(box, 2)) * box.reduce((n, p) => n + p.count, 0);
      if (value > score) { chosen = i; score = value; }
    }
    if (chosen < 0) break;
    const box = boxes[chosen]!;
    let channel = 0;
    for (let c = 1; c < 3; c++) if (range(box, c) > range(box, channel)) channel = c;
    box.sort((a, b) => a.rgb[channel]! - b.rgb[channel]! || lex(a.rgb, b.rgb));
    const halfway = box.reduce((n, p) => n + p.count, 0) / 2;
    let sum = 0, split = 1;
    for (let i = 0; i < box.length - 1; i++) {
      sum += box[i]!.count;
      split = i + 1;
      if (sum >= halfway) break;
    }
    boxes.splice(chosen, 1, box.slice(0, split), box.slice(split));
  }
  const palette = boxes.map(box => {
    const weight = box.reduce((n, p) => n + p.count, 0);
    return [0, 1, 2].map(c => Math.round(box.reduce((n, p) => n + p.rgb[c]! * p.count, 0) / weight)) as [number, number, number];
  });
  return Object.freeze([...new Map(palette.map(p => [p.join(','), p])).values()].sort(lex).map(p => Object.freeze(p)));
}
export function paletteImage(image: RgbaImage, palette: readonly Rgb[]): RgbaImage {
  requireRule(palette.length > 0 && palette.length <= 256, 'EXPERIMENT_PALETTE', 'A bounded palette is required.');
  const data = image.bytes();
  for (let i = 0; i < data.length; i += 4) {
    let best = palette[0]!, distance = Infinity;
    for (const color of palette) {
      const next = color.reduce((n, v, c) => n + (v - data[i + c]!) ** 2, 0);
      if (next < distance) { best = color; distance = next; }
    }
    data.set(best, i);
  }
  return new RgbaImage({ width: image.width, height: image.height, data });
}
export function connectEdges(image: RgbaImage, method: 'copy-one-line' | 'paired-band') {
  requireRule(image.width === 24 && image.height === 24, 'EXPERIMENT_BASE', '24x24 logical base required.');
  const data = image.bytes(), before = image.bytes();
  if (method === 'copy-one-line') {
    for (let y = 0; y < 24; y++) data.set(data.slice(y * 24 * 4, y * 24 * 4 + 4), (y * 24 + 23) * 4);
    for (let x = 0; x < 24; x++) data.set(data.slice(x * 4, x * 4 + 4), (23 * 24 + x) * 4);
  } else {
    // Explicit sRGB-number interpolation, then projection to the SAME learned palette.
    // At the outer pair both samples meet at their mean; influence fades to 1/4 at distance3.
    for (const axis of ['x', 'y']) {
      const input = data.slice();
      for (let line = 0; line < 24; line++) for (let d = 0; d < ART_EXPERIMENT.band; d++) {
        const a = axis === 'x' ? (line * 24 + d) * 4 : (d * 24 + line) * 4;
        const b = axis === 'x' ? (line * 24 + 23 - d) * 4 : ((23 - d) * 24 + line) * 4;
        const weight = 1 - d / ART_EXPERIMENT.band;
        for (let c = 0; c < 3; c++) {
          const mean = (input[a + c]! + input[b + c]!) / 2;
          data[a + c] = Math.round(input[a + c]! * (1 - weight) + mean * weight);
          data[b + c] = Math.round(input[b + c]! * (1 - weight) + mean * weight);
        }
      }
    }
  }
  let changed = 0, absolute = 0;
  for (let i = 0; i < data.length; i += 4) {
    if ([0, 1, 2].some(c => data[i + c] !== before[i + c])) changed++;
    for (let c = 0; c < 3; c++) absolute += Math.abs(data[i + c]! - before[i + c]!);
  }
  return { image: new RgbaImage({ width: 24, height: 24, data }), changedFraction: changed / 576, meanAbsoluteRgbChange: absolute / (576 * 3) };
}
export function sourceFrames(base: RgbaImage, component: 'grass' | 'water') {
  requireRule(base.width === 24 && base.height === 24, 'EXPERIMENT_BASE', '24x24 logical base required.');
  const input = base.bytes();
  return (component === 'grass' ? [0] : ART_EXPERIMENT.frames).map(phase => {
    const out = blank(96, 144);
    for (let y = 0; y < 144; y++) for (let x = 0; x < 96; x++) {
      const sx = (Math.floor(x / 2) + phase) % 24, sy = Math.floor(y / 2) % 24;
      out.data.set(input.subarray((sy * 24 + sx) * 4, (sy * 24 + sx) * 4 + 4), (y * 96 + x) * 4);
    }
    const image = new RgbaImage(out); validateDensity(image, 2); return image;
  });
}
export function colorCount(image: RgbaImage) {
  const b = image.bytes(), colors = new Set<string>();
  for (let i = 0; i < b.length; i += 4) if (b[i + 3]) colors.add(`${b[i]},${b[i + 1]},${b[i + 2]}`);
  return colors.size;
}
export function changedFraction(a: RgbaImage, b: RgbaImage) {
  requireRule(a.width === b.width && a.height === b.height, 'EXPERIMENT_SIZE', 'Matching images required.');
  const x = a.bytes(), y = b.bytes(); let changed = 0;
  for (let i = 0; i < x.length; i += 4) if ([0, 1, 2].some(c => x[i + c] !== y[i + c])) changed++;
  return changed / (x.length / 4);
}
