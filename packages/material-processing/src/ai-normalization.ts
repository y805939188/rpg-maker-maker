import { RgbaImage, requireRule } from '@tileset/asset-core';
import { crop, resizeNearest, blank } from './index.js';
/** A versioned, deliberately lossy terrain conversion, never an implicit source validator. */
export const AI_CONVERSION = Object.freeze({
  version: 'ai-periodic-source-v1',
  crop: 'largest-centered-square-integer',
  sample: 'nearest-explicit-24-square',
  palette: 'rgb-2bit-per-channel-round-srgb-no-color-conversion',
  density: 2,
  tile: 48,
  width: 96,
  height: 144,
  animation: 'shared-base-periodic-offset-0-1-2-logical-pixels',
});
export function prepareReferenceV2(image: RgbaImage): RgbaImage {
  const edge = Math.min(image.width, image.height);
  return resizeNearest(
    crop(image, {
      x: Math.floor((image.width - edge) / 2),
      y: Math.floor((image.height - edge) / 2),
      width: edge,
      height: edge,
    }),
    { width: 256, height: 256, method: 'nearest-explicit' },
  );
}
export function normalizeAiTerrain(image: RgbaImage, component: 'grass' | 'water') {
  requireRule(
    image.width >= 48 && image.height >= 48,
    'AI_INPUT_SIZE',
    'AI candidate is too small.',
  );
  requireRule(
    image.bytes().every((v, i) => i % 4 !== 3 || v === 255),
    'AI_INPUT_ALPHA',
    'Terrain requires opaque pixels.',
  );
  const edge = Math.min(image.width, image.height);
  const rect = {
    x: Math.floor((image.width - edge) / 2),
    y: Math.floor((image.height - edge) / 2),
    width: edge,
    height: edge,
  };
  const base = resizeNearest(crop(image, rect), {
    width: 24,
    height: 24,
    method: 'nearest-explicit',
  }).bytes();
  for (let i = 0; i < base.length; i += 4)
    for (let c = 0; c < 3; c++) base[i + c] = Math.round(base[i + c]! / 85) * 85;
  // Copy the first sample onto the opposite edge, recording that explicit periodicization.
  for (let y = 0; y < 24; y++) base.set(base.slice(y * 24 * 4, y * 24 * 4 + 4), (y * 24 + 23) * 4);
  for (let x = 0; x < 24; x++) base.set(base.slice(x * 4, x * 4 + 4), (23 * 24 + x) * 4);
  const frames = Array.from({ length: component === 'water' ? 3 : 1 }, (_, frame) => {
    const output = blank(96, 144);
    for (let y = 0; y < 144; y++)
      for (let x = 0; x < 96; x++) {
        const sx = (Math.floor(x / 2) + frame) % 24,
          sy = Math.floor(y / 2) % 24;
        output.data.set(
          base.subarray((sy * 24 + sx) * 4, (sy * 24 + sx) * 4 + 4),
          (y * 96 + x) * 4,
        );
      }
    return new RgbaImage(output);
  });
  let changedPixels = 0;
  if (frames.length === 3) {
    const first = frames[0]!.bytes(),
      next = frames[1]!.bytes();
    for (let i = 0; i < first.length; i += 4)
      if ([0, 1, 2].some((c) => first[i + c] !== next[i + c])) changedPixels++;
  }
  const changed = changedPixels / (96 * 144);
  requireRule(
    component !== 'water' || changed >= 0.01,
    'AI_ANIMATION_STATIC',
    'Shared water base has less than 1% visible motion; reject or select another candidate.',
  );
  return {
    frames,
    descriptor: {
      ...AI_CONVERSION,
      input: { width: image.width, height: image.height, pixelHash: image.pixelHash },
      rect,
      periodicization: 'copy-opposite-edge-v1',
      changedFraction: changed,
      outputPixelHashes: frames.map((f) => f.pixelHash),
    },
  };
}
