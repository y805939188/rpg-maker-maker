import { freezeJson } from '@tileset/asset-core';

/** Target rules transcribed from the retained step-01 Profile; tests detect drift. */
export const TARGET = freezeJson({
  id: 'mz-native-ground-water',
  version: '1.0.0-candidate.1',
  engineVersion: '1.10.0',
  mode: 1,
  tileSize: 48,
  quarterSize: 24,
  source: { width: 96, height: 144 },
  atlas: { width: 768, height: 576 },
  coreSha256: '4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f',
  animation: { sourceFrames: 3, sequence: [0, 1, 2, 1], updatesPerState: 30 },
  shoreline: 'opaque-water-owned-baked-grass-bank-v1',
  maskPixelHash: '2ab33dc7a3e6a56f7cb786192613351376f086faf117839e627ee0b7a2f9b422',
  densities: [1, 2],
  groundKinds: [16, 17],
  waterKinds: [4, 6],
});

const names = [
  ['representative-nw', 'representative-ne', 'inner-nw', 'inner-ne'],
  ['representative-sw', 'representative-se', 'inner-sw', 'inner-se'],
  ['outer-nw', 'north-e', 'north-w', 'outer-ne'],
  ['west-s', 'center-se', 'center-sw', 'east-s'],
  ['west-n', 'center-ne', 'center-nw', 'east-n'],
  ['outer-sw', 'south-e', 'south-w', 'outer-se'],
];
export const REGIONS = freezeJson(
  names.flatMap((row, y) =>
    row.map((name, x) => ({
      name,
      role: name.startsWith('inner-')
        ? ('inner-corner' as const)
        : name.startsWith('outer-')
          ? ('outer-corner' as const)
          : /^(center|representative)-/.test(name)
            ? ('center' as const)
            : ('edge' as const),
      x: x * 24,
      y: y * 24,
    })),
  ),
);

/** MZ 1.10.0 FLOOR_AUTOTILE_TABLE, expressed as quarter indices in a 4×6 pattern.
 * Source: pinned unmodified rmmz_core.js / public Tilemap API. 47 is representative. */
export const SHAPES = freezeJson([
  [18, 17, 14, 13],
  [2, 17, 14, 13],
  [18, 3, 14, 13],
  [2, 3, 14, 13],
  [18, 17, 14, 7],
  [2, 17, 14, 7],
  [18, 3, 14, 7],
  [2, 3, 14, 7],
  [18, 17, 6, 13],
  [2, 17, 6, 13],
  [18, 3, 6, 13],
  [2, 3, 6, 13],
  [18, 17, 6, 7],
  [2, 17, 6, 7],
  [18, 3, 6, 7],
  [2, 3, 6, 7],
  [16, 17, 12, 13],
  [16, 3, 12, 13],
  [16, 17, 12, 7],
  [16, 3, 12, 7],
  [10, 9, 14, 13],
  [10, 9, 14, 7],
  [10, 9, 6, 13],
  [10, 9, 6, 7],
  [18, 19, 14, 15],
  [18, 19, 6, 15],
  [2, 19, 14, 15],
  [2, 19, 6, 15],
  [18, 17, 22, 21],
  [2, 17, 22, 21],
  [18, 3, 22, 21],
  [2, 3, 22, 21],
  [16, 19, 12, 15],
  [10, 9, 22, 21],
  [8, 9, 12, 13],
  [8, 9, 12, 7],
  [10, 11, 14, 15],
  [10, 11, 6, 15],
  [18, 19, 22, 23],
  [2, 19, 22, 23],
  [16, 17, 20, 21],
  [16, 3, 20, 21],
  [8, 11, 12, 15],
  [8, 9, 20, 21],
  [16, 19, 20, 23],
  [10, 11, 22, 23],
  [8, 11, 20, 23],
  [0, 1, 4, 5],
]);
