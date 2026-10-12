import { readFileSync } from 'node:fs';
import { RawSource, styleProfile, validatedDecodedSource } from '@tileset/asset-core';
import type { SourceRole } from '@tileset/asset-core';
import { shorelineParameters, shorelineRecipe } from '../src/index.js';
export const art = JSON.parse(
  readFileSync(new URL('./fixtures/fixed-shoreline.json', import.meta.url), 'utf8'),
) as {
  width: number;
  height: number;
  density: number;
  grass: number[][];
  water: number[][][];
  mask: number[][];
  overlay: number[][];
  expected: number[][][];
  palette: [number, number, number][];
};
export const provenance = {
  origin: 'manual' as const,
  author: 'Independent literal fixture',
  license: 'CC0-1.0',
  toolVersion: 'hand-selected-pixels-v1',
  parents: [],
};
export function source(
  id: string,
  role: SourceRole,
  pixels: number[][],
  revision = 1,
  density = art.density,
  width = art.width,
  height = art.height,
) {
  const data = new Uint8Array(pixels.flat());
  const raw = new RawSource({
    id,
    revision,
    role,
    density,
    encoding: 'rgba8',
    bytes: data,
    provenance,
  });
  return validatedDecodedSource(raw, { width, height, data });
}
export function fixture() {
  const grass = source('grass', 'grass', art.grass, 3),
    water = art.water.map((pixels, i) => source(`water-${i}`, 'water', pixels));
  const mask = source('mask', 'static-mask', art.mask, 2),
    overlay = source('bank-detail', 'bank-overlay', art.overlay);
  const style = styleProfile('style', 2, {
    logicalPixelScale: art.density,
    palette: art.palette,
    lighting: 'flat',
    outline: 'dark',
  });
  const parameters = shorelineParameters('shore-parameters', 4, {
    geometry: {
      width: art.width,
      height: art.height,
      tileWidth: 2,
      tileHeight: 2,
      regions: [
        { name: 'bank-edge', role: 'edge', rect: { x: 0, y: 0, width: 2, height: 2 } },
        { name: 'interior', role: 'center', rect: { x: 2, y: 0, width: 2, height: 2 } },
      ],
    },
    animation: {
      frameCount: 3,
      sequence: [0, 1, 2, 1],
      durations: [30, 30, 30, 30],
      timebase: 'updates',
      loop: true,
    },
    composition: 'linear-srgb-source-over',
    mask: 'white-static-bank',
  });
  const recipe = shorelineRecipe('shore', 5, {
    version: 'fixed-shoreline-v1',
    grass: grass.ref,
    water: water.map((s) => s.ref),
    staticMask: mask.ref,
    bankOverlay: overlay.ref,
    style: style.ref,
    parameters: parameters.ref,
  });
  return { recipe, sources: [grass, ...water, mask, overlay], style, parameters };
}
