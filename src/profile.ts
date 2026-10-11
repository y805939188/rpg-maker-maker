export const PROFILE = {
  id: 'mz-native-ground-water',
  version: '1.0.0-candidate.1',
  status: 'CANDIDATE_REQUIRES_EDITOR_AND_GAME_EVIDENCE',
  engine: 'RPG Maker MZ',
  engineVersion: '1.10.0',
  coreSha256: '4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f',
  mode: 1, // MZ Area Type
  tileSize: 48,
  quarterSize: 24,
  atlas: { width: 768, height: 576 },
  source: { width: 96, height: 144 },
  groundSlots: [
    { kind: 16, tileId: 2816, x: 0, y: 0 },
    { kind: 17, tileId: 2864, x: 96, y: 0 },
  ],
  waterSlots: [
    { kind: 4, tileId: 2240, x: 384, y: 0 },
    { kind: 6, tileId: 2336, x: 384, y: 144 },
  ],
  capacity: { ground: 2, water: 2, pairedSets: 2 },
  animation: { sourceFrames: 3, sequence: [0, 1, 2, 1], updatesPerState: 30 },
  shoreline: 'opaque-water-owned-baked-grass-bank-v1',
  flags: { ground: 0, water: 15, emptyUpperTile: 16 },
  pixelContract: 'rgba8-srgb-integer-v1',
} as const;

export function sourceFrameAtUpdate(updateCount: number): number {
  if (!Number.isSafeInteger(updateCount) || updateCount < 0) {
    throw new Error('Animation update count must be a non-negative safe integer');
  }
  return PROFILE.animation.sequence[Math.floor(updateCount / 30) % 4]!;
}
