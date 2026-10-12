import { beforeAll, describe, expect, it } from 'vitest';
import { RgbaImage, tileIRHash, validateTileIR } from '@tileset/asset-core';
import { processShoreline } from '@tileset/material-processing';
import { fixture as genericFixture } from '../../material-processing/tests/fixture.js';
import type { TileIR } from '@tileset/asset-core';
import {
  compileFragment,
  CompilationError,
  renderShape,
  sourceFrameAtUpdate,
  TARGET,
  REGIONS,
  validateFragment,
} from '@tileset/mz-compiler';
import { PROFILE } from '../../../src/profile.js';
import { makeCompilerFixture } from '../../../scripts/step04-fixture.js';

let art: Awaited<ReturnType<typeof makeCompilerFixture>>,
  diagnostic: typeof art,
  shuffled: typeof art;
beforeAll(async () => {
  art = await makeCompilerFixture('art');
  diagnostic = await makeCompilerFixture('diagnostic');
  shuffled = await makeCompilerFixture('art', true);
}, 30000);
function change(ir: TileIR, patch: Partial<TileIR>): TileIR {
  const next = { ...ir, ...patch };
  return { ...next, contentHash: tileIRHash(next) };
}
function targetReject(ir: TileIR, code: string) {
  validateTileIR(ir); // Valid generic input reaches the claimed target boundary.
  expect(() => compileFragment(ir, 'a1-water')).toThrowError(
    expect.objectContaining({ boundary: 'target', code }),
  );
}
// Hand transcribed expected quarter numbers from the pinned MZ 1.10.0 floor table.
// Kept separate from implementation; native VM oracle also checks the original core at runtime.
const expectedQuarters = [
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
];
function expectedTile(f: typeof art, shape: number, frame: number | null) {
  const result = new Uint8Array(48 * 48 * 4),
    ground = f.originalGround.image.bytes(),
    mask = f.originalMask.image.bytes();
  const water = frame === null ? ground : f.originalWater[frame]!.image.bytes();
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 48; x++) {
      const q = expectedQuarters[shape]![Math.floor(y / 24) * 2 + Math.floor(x / 24)]!;
      const start = ((Math.floor(q / 4) * 24 + (y % 24)) * 96 + (q % 4) * 24 + (x % 24)) * 4;
      // Art water is an independently authored expected master. Diagnostic fixed bank uses grass.
      const from = frame !== null && f === diagnostic && mask[start] === 255 ? ground : water;
      result.set(from.subarray(start, start + 4), (y * 48 + x) * 4);
    }
  return result;
}
describe('production exports and Profile', () => {
  it('matches retained rules and mask without upgrading candidate status', () => {
    expect(import.meta.resolve('@tileset/mz-compiler')).toMatch(/mz-compiler\/dist\/index\.js$/);
    for (const key of [
      'id',
      'version',
      'engineVersion',
      'mode',
      'tileSize',
      'quarterSize',
      'source',
      'atlas',
      'coreSha256',
      'animation',
      'shoreline',
    ] as const)
      expect(TARGET[key]).toEqual(PROFILE[key]);
    expect(TARGET.groundKinds).toEqual(PROFILE.groundSlots.map((s) => s.kind));
    expect(TARGET.waterKinds).toEqual(PROFILE.waterSlots.map((s) => s.kind));
    expect(TARGET.maskPixelHash).toBe(art.originalMask.image.pixelHash);
    expect(REGIONS).toHaveLength(24);
  });
  it.each([
    null,
    undefined,
    42,
    true,
    'BUILT_ARTIFACT',
    [],
    {},
    { contract: 'tile-ir-v1' },
    { state: 'BUILT_ARTIFACT', ir: {} },
  ])('rejects ordinary JSON/value %j with stable IR boundary', (value) => {
    expect(() => compileFragment(value, 'a2-ground')).toThrowError(CompilationError);
  });
  it('checks original scalar types, hashes, dense arrays and exact dependencies', () => {
    const ir = art.built.ir;
    for (const bad of [false, 'true', 1, ['true']])
      expect(() =>
        compileFragment(
          change(ir, { ground: { ...ir.ground, opaque: bad as boolean } }),
          'a2-ground',
        ),
      ).toThrowError(expect.objectContaining({ boundary: 'ir', code: 'IR_SEMANTICS' }));
    const regions = ir.geometry.regions.map((r) => ({ ...r }));
    regions[0]!.name = ['representative-nw'] as unknown as string;
    expect(() =>
      compileFragment(change(ir, { geometry: { ...ir.geometry, regions } }), 'a2-ground'),
    ).toThrowError(expect.objectContaining({ code: 'GEOMETRY' }));
    expect(() => compileFragment({ ...ir, contentHash: '0'.repeat(64) }, 'a2-ground')).toThrowError(
      expect.objectContaining({ code: 'IR_HASH' }),
    );
    expect(() =>
      compileFragment(
        change(ir, { dependencies: ir.dependencies.filter((d) => d.kind !== 'parameters') }),
        'a2-ground',
      ),
    ).toThrowError(expect.objectContaining({ code: 'IR_DEPENDENCIES' }));
    const sparse = [...ir.frames];
    delete sparse[1];
    expect(() => compileFragment({ ...ir, frames: sparse }, 'a2-ground')).toThrowError(
      expect.objectContaining({ code: 'IR_FRAMES' }),
    );
    expect(() =>
      compileFragment({ ...ir, groundImage: { ...ir.groundImage } }, 'a2-ground'),
    ).toThrowError(expect.objectContaining({ boundary: 'ir' }));
  });
});
it('names logical directions by final Tile quadrants, not source-block position', () => {
  const coordinates = (name: string) => {
    const r = REGIONS.find((r) => r.name === name)!;
    return [r.x, r.y];
  };
  expect(coordinates('center-nw')).toEqual([48, 96]);
  expect(coordinates('center-ne')).toEqual([24, 96]);
  expect(coordinates('center-sw')).toEqual([48, 72]);
  expect(coordinates('center-se')).toEqual([24, 72]);
  expect(coordinates('north-w')).toEqual([48, 48]);
  expect(coordinates('west-n')).toEqual([0, 96]);
  expect(coordinates('east-n')).toEqual([72, 96]);
  expect(coordinates('south-w')).toEqual([48, 120]);
});
describe('target compatibility with independently valid IR controls', () => {
  it.each([
    { sequence: [0, 1, 2], durations: [30, 30, 30] },
    { sequence: [2, 1, 0, 1] },
    { timebase: 'milliseconds' },
    { loop: false },
    { durations: [29, 30, 30, 30] },
  ])('rejects native clip mismatch %j', (patch) =>
    targetReject(
      change(art.built.ir, {
        animation: { ...art.built.ir.animation, ...patch } as TileIR['animation'],
      }),
      'MZ_ANIMATION',
    ),
  );
  it('rejects two and four source frames without silently dropping/repeating', () => {
    const ir = art.built.ir;
    targetReject(
      change(ir, {
        frames: ir.frames.slice(0, 2),
        water: { ...ir.water, components: ir.water.components.slice(0, 2) },
        animation: {
          frameCount: 2,
          sequence: [0, 1],
          durations: [30, 30],
          timebase: 'updates',
          loop: true,
        },
      }),
      'MZ_ANIMATION',
    );
    const ref = { ...ir.water.components[2]!, id: 'water-extra' };
    targetReject(
      change(ir, {
        frames: [...ir.frames, ir.frames[0]!],
        water: { ...ir.water, components: [...ir.water.components, ref] },
        dependencies: [...ir.dependencies, ref],
        animation: {
          frameCount: 4,
          sequence: [0, 1, 2, 3],
          durations: [30, 30, 30, 30],
          timebase: 'updates',
          loop: true,
        },
      }),
      'MZ_ANIMATION',
    );
  });
  it('A2 ignores target water timing but still validates the entire generic IR', () => {
    const ir = change(art.built.ir, {
      animation: { ...art.built.ir.animation, timebase: 'milliseconds', loop: false },
    });
    expect(compileFragment(ir, 'a2-ground').layout.playback).toBeNull();
  });
  it('rejects the real small generic step03 recipe at the dimension boundary', () =>
    targetReject(processShoreline(genericFixture()).ir, 'MZ_GEOMETRY'));
  it('rejects a legal density-3 generic plane before native mask checks', () => {
    const ir = art.built.ir;
    const plane = (color: number, staticBank = false) => {
      const data = new Uint8Array(96 * 144 * 4);
      for (let y = 0; y < 144; y++)
        for (let x = 0; x < 96; x++)
          data.set(
            staticBank
              ? x < 48
                ? [255, 255, 255, 255]
                : [0, 0, 0, 255]
              : [x < 48 ? 20 : color, 70, 100, 255],
            (y * 96 + x) * 4,
          );
      return new RgbaImage({ width: 96, height: 144, data });
    };
    targetReject(
      change(ir, {
        density: 3,
        groundImage: plane(20),
        frames: [plane(40), plane(60), plane(80)],
        staticMaskImage: plane(0, true),
      }),
      'MZ_DENSITY',
    );
  });
  it('rejects a semi-transparent output despite strict opaque metadata', () => {
    const ir = art.built.ir,
      data = ir.groundImage.bytes();
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) data[(y * 96 + x) * 4 + 3] = 128;
    expect(() =>
      compileFragment(
        change(ir, { groundImage: new RgbaImage({ width: 96, height: 144, data }) }),
        'a2-ground',
      ),
    ).toThrowError(expect.objectContaining({ boundary: 'ir', code: 'IR_ALPHA' }));
  });
  it('rejects legal geometry lacking native orientation', () => {
    const ir = art.built.ir;
    targetReject(
      change(ir, {
        geometry: {
          ...ir.geometry,
          regions: ir.geometry.regions.map((r, i) => ({ ...r, name: `generic-${i}` })),
        },
      }),
      'MZ_REGIONS',
    );
    targetReject(
      change(ir, {
        geometry: {
          ...ir.geometry,
          regions: ir.geometry.regions.map((r, i) => (i === 0 ? { ...r, role: 'edge' } : r)),
        },
      }),
      'MZ_REGIONS',
    );
    targetReject(
      change(ir, { geometry: { ...ir.geometry, tileWidth: 24, tileHeight: 24 } }),
      'MZ_GEOMETRY',
    );
  });
  it('rejects a generically valid but different fixed mask', () => {
    const ir = art.built.ir,
      mask = ir.staticMaskImage.bytes();
    // Remove one white 2×2 block; generic fixed-bank equality remains valid.
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) mask.set([0, 0, 0, 255], ((48 + y) * 96 + x) * 4);
    targetReject(
      change(ir, { staticMaskImage: new RgbaImage({ width: 96, height: 144, data: mask }) }),
      'MZ_SHORELINE',
    );
  });
  it('rejects unsupported category rather than accepting A1 waterfalls', () =>
    expect(() => compileFragment(art.built.ir, 'waterfall' as 'a1-water')).toThrowError(
      expect.objectContaining({ code: 'MZ_CATEGORY' }),
    ));
});
describe('Fragment structure, deterministic pixels and ownership', () => {
  it('compiles a real step03 chain with source-bound metadata and relative layout', () => {
    const ir = art.built.ir,
      g = compileFragment(ir, 'a2-ground'),
      w = compileFragment(ir, 'a1-water');
    expect([g.image.width, g.image.height, g.image.bytes().length]).toEqual([96, 144, 55296]);
    expect([w.image.width, w.image.height, w.image.bytes().length]).toEqual([288, 144, 165888]);
    expect(w.layout.offsets).toEqual([
      { x: 0, y: 0 },
      { x: 96, y: 0 },
      { x: 192, y: 0 },
    ]);
    expect(w.placement).toEqual({
      slotClass: 'a1-block-d-water',
      allowedKinds: [4, 6],
      width: 288,
      height: 144,
      alignment: { x: 96, y: 144 },
    });
    expect(w.source.irHash).toBe(ir.contentHash);
    expect(w.source.dependencies).toEqual(ir.dependencies);
    expect(art.built.targetCompilation).toBe('NOT_EXECUTED');
    validateFragment(w);
    expect(compileFragment(ir, 'a1-water').contentHash).toBe(w.contentHash);
  });
  it('maps explicitly shuffled semantic quarters to the exact independent art master', () => {
    for (const category of ['a2-ground', 'a1-water'] as const)
      expect(compileFragment(shuffled.built.ir, category).image.bytes()).toEqual(
        compileFragment(art.built.ir, category).image.bytes(),
      );
    expect(compileFragment(art.built.ir, 'a2-ground').image.bytes()).toEqual(
      art.originalGround.image.bytes(),
    );
  });
  it('does not retain mutable metadata, arrays, source Buffer views or output getters', () => {
    const ir = art.built.ir,
      regions = ir.geometry.regions.map((r) => ({ ...r, rect: { ...r.rect } })),
      animation = { ...ir.animation, sequence: [...ir.animation.sequence] },
      dependencies = ir.dependencies.map((r) => ({ ...r }));
    const mutable = { ...ir, geometry: { ...ir.geometry, regions }, animation, dependencies };
    const f = compileFragment(mutable, 'a1-water'),
      hash = f.contentHash,
      pixels = f.image.bytes();
    regions[0]!.name = 'modified';
    dependencies[0]!.id = 'modified';
    animation.sequence[0] = 2;
    f.image.bytes().fill(0);
    f.image.pixels().data.fill(0);
    art.sources[0]!.raw.bytes().fill(0);
    expect(f.contentHash).toBe(hash);
    expect(f.image.bytes()).toEqual(pixels);
    validateFragment(f);
    expect(Object.isFrozen(f.source.dependencies)).toBe(true);
    expect(() => validateFragment({ ...f })).toThrowError(
      expect.objectContaining({ code: 'FRAGMENT_OWNERSHIP' }),
    );
    expect(() => validateFragment(JSON.parse(JSON.stringify(f)))).toThrowError(CompilationError);
  });
  it('snapshots distinct views of one mutable Buffer at the step03 boundary', () => {
    const buffer = Buffer.from(art.built.ir.groundImage.bytes()),
      image = new RgbaImage({ width: 96, height: 144, data: buffer.subarray(0) });
    const ir = change(art.built.ir, { groundImage: image });
    const f = compileFragment(ir, 'a2-ground');
    const pixels = f.image.bytes();
    buffer.fill(0);
    expect(f.image.bytes()).toEqual(pixels);
    expect(image.bytes()).toEqual(pixels);
  });
  it.each(['art', 'diagnostic'] as const)(
    'renders all 47 connecting shapes and representative 47 with full bytes / %s',
    (family) => {
      const f = family === 'art' ? art : diagnostic,
        ground = compileFragment(f.built.ir, 'a2-ground'),
        water = compileFragment(f.built.ir, 'a1-water');
      for (let shape = 0; shape < 48; shape++) {
        expect(renderShape(ground, shape).bytes()).toEqual(expectedTile(f, shape, null));
        [0, 30, 60, 90].forEach((update, state) =>
          expect(renderShape(water, shape, update).bytes()).toEqual(
            expectedTile(f, shape, [0, 1, 2, 1][state]!),
          ),
        );
      }
    },
  );
  it('checks every update in five periods including all requested state boundaries', () => {
    for (let update = 0; update <= 600; update++)
      expect(sourceFrameAtUpdate(update)).toBe([0, 1, 2, 1][Math.floor(update / 30) % 4]);
    expect([0, 29, 30, 59, 60, 89, 90, 119, 120].map(sourceFrameAtUpdate)).toEqual([
      0, 0, 1, 1, 2, 2, 1, 1, 0,
    ]);
  });
  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '30', null])(
    'rejects invalid update %j',
    (n) =>
      expect(() => sourceFrameAtUpdate(n as number)).toThrowError(
        expect.objectContaining({ code: 'MZ_UPDATE' }),
      ),
  );
  it.each([-1, 48, 1.5, '1', NaN])('rejects invalid shape %j', (s) =>
    expect(() => renderShape(compileFragment(art.built.ir, 'a2-ground'), s as number)).toThrowError(
      expect.objectContaining({ code: 'MZ_SHAPE' }),
    ),
  );
});
