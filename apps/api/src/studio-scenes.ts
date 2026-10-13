import { connectedShape, shapeRectangles } from '@tileset/mz-compiler';
import type { RenderDescriptor } from '@tileset/contracts';
import type { LayoutPlan } from '@tileset/pack-assembly';
export const SCENES = {
  isolated: ['.......', '...#...', '.......'],
  edges: ['.......', '.#####.', '.#####.', '.#####.', '.......'],
  holes: ['.......', '.#####.', '.#.#.#.', '.#####.', '.#...#.', '.#####.', '.......'],
  channel: ['.......', '.##....', '..#....', '..###..', '....#..', '...##..', '.......'],
  pond: [
    '...........',
    '..###......',
    '.#####.....',
    '.######....',
    '..######...',
    '...#####...',
    '.....##....',
    '...........',
  ],
  large: [
    '###########',
    '###########',
    '###########',
    '###########',
    '###########',
    '###########',
    '###########',
    '###########',
  ],
} as const;
export function sceneStates(
  plan: LayoutPlan,
  scene: keyof typeof SCENES,
  group: string,
  sequence: readonly number[],
  tileSize: number,
) {
  const rows = SCENES[scene],
    width = rows[0]!.length,
    height = rows.length;
  const water = plan.placements.find((p) => p.atlas === 'A1' && p.binding.logicalId === group);
  if (!water) throw new Error('Unknown water binding');
  const ground = plan.placements.find(
    (p) => p.atlas === 'A2' && p.binding.logicalId === water.binding.groundId,
  );
  if (!ground) throw new Error('Missing paired ground');
  const occupied = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && rows[y]![x] === '#';
  const states: RenderDescriptor['states'] = sequence.map((frame) => {
    const tiles: RenderDescriptor['states'][number] = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const wet = occupied(x, y),
          p = wet ? water : ground;
        const shape = wet
          ? connectedShape({
              north: occupied(x, y - 1),
              south: occupied(x, y + 1),
              west: occupied(x - 1, y),
              east: occupied(x + 1, y),
              nw: occupied(x - 1, y - 1),
              ne: occupied(x + 1, y - 1),
              sw: occupied(x - 1, y + 1),
              se: occupied(x + 1, y + 1),
            })
          : 0;
        tiles.push({
          atlas: p.atlas,
          shape,
          tileId: p.tileId + shape,
          rects: shapeRectangles(shape).map((r) => ({
            ...r,
            sx: p.x + r.sx + (wet ? frame * p.binding.fragment.layout.frameWidth : 0),
            sy: p.y + r.sy,
            dx: x * tileSize + r.dx,
            dy: y * tileSize + r.dy,
          })),
        });
      }
    return tiles;
  });
  return { width: width * tileSize, height: height * tileSize, states };
}
