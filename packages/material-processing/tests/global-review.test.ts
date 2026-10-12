import { describe, expect, it } from 'vitest';
import {
  AssetError,
  RevisionCatalog,
  RgbaImage,
  animationClip,
  assessBuild,
  buildProcessedAsset,
  createRevision,
  geometry,
  tileIRHash,
  validateTileIR,
} from '@tileset/asset-core';
import type { BuiltAsset, Geometry, TileIR } from '@tileset/asset-core';
import {
  processShoreline,
  shorelineParameters,
  shorelineRecipe,
} from '@tileset/material-processing';
import { art, fixture } from './fixture.js';

function rejects(run: () => unknown, code: string) {
  expect(run).toThrow(AssetError);
  expect(run).toThrow(expect.objectContaining({ code }));
}
function rehash(ir: TileIR): TileIR {
  return { ...ir, contentHash: tileIRHash(ir) };
}
function withNames(names: readonly unknown[]): Geometry {
  const g = fixture().parameters.value.geometry;
  return {
    ...g,
    regions: g.regions.map((region, i) => ({ ...region, name: names[i] as string })),
  };
}

describe('GR-0203-001: runtime scalar rejection before Built', () => {
  it.each([
    ['array', ['build-one']],
    ['object', {}],
    ['number', 1],
    ['boolean', true],
    ['null', null],
    ['missing', undefined],
  ])('rejects %s Built IDs at construction', (_label, id) => {
    const input = processShoreline(fixture());
    rejects(() => buildProcessedAsset(input, id as string), 'BUILD_STATE');
    if (Array.isArray(id)) {
      id[0] = 'build-two';
      rejects(() => buildProcessedAsset(input, id as unknown as string), 'BUILD_STATE');
    }
  });
  it('keeps valid ID format, owned snapshots and IR content hash semantics', () => {
    const input = processShoreline(fixture());
    for (const id of ['', 'Build', 'has space', 'a'.repeat(65)])
      rejects(() => buildProcessedAsset(input, id), 'BUILD_STATE');
    const metadata = { ...input.ir.ground, material: { ...input.ir.ground.material } };
    const ir = rehash({ ...input.ir, ground: metadata });
    const built = buildProcessedAsset({ state: 'COMPILABLE_RECIPE', ir }, 'build-one');
    const another = buildProcessedAsset(input, 'build-two');
    metadata.material.id = 'changed';
    ir.frames[0]!.bytes().fill(0);
    expect(built.id).toBe('build-one');
    expect(built.ir.ground.material.id).toBe(input.ir.ground.material.id);
    expect(Object.isFrozen(built)).toBe(true);
    expect(Object.isFrozen(built.ir.ground.material)).toBe(true);
    expect(Object.isFrozen(built.ir.frames)).toBe(true);
    expect(built.artifactHash).toBe(input.ir.contentHash);
    expect(another.artifactHash).toBe(built.artifactHash);
    expect(built.targetCompilation).toBe('NOT_EXECUTED');
    expect(built.ir.frames.map((p) => [...p.bytes()])).toEqual(art.expected.map((p) => p.flat()));
  });
  it('also rejects non-string or malformed IDs at the public historical Built validator', () => {
    const built = buildProcessedAsset(processShoreline(fixture()), 'history');
    const catalog = new RevisionCatalog();
    built.ir.dependencies.forEach((ref) => catalog.publish(ref));
    expect(assessBuild(built, catalog, built.ir.dependencies).historicalValidity).toBe('VALID');
    for (const id of [['history'], {}, 1, true, null, undefined, '', 'Invalid'])
      rejects(
        () => assessBuild({ ...built, id } as BuiltAsset, catalog, built.ir.dependencies),
        'BUILD_STATE',
      );
  });
  it('rejects independent array region names, other non-string names and duplicate strings', () => {
    for (const names of [
      [['same'], ['same']],
      [{}, 'water'],
      [1, 'water'],
      [true, 'water'],
      [null, 'water'],
      [undefined, 'water'],
      ['same', 'same'],
      ['Invalid', 'water'],
    ])
      rejects(() => geometry(withNames(names)), 'GEOMETRY');
    const valid = withNames(['bank', 'water']);
    expect(geometry(valid)).toEqual(valid);
  });
  it('rejects invalid names through the shoreline parameter constructor and processing revalidation', () => {
    const input = fixture();
    const malformed = { ...input.parameters.value, geometry: withNames([['same'], ['same']]) };
    rejects(() => shorelineParameters('shore-parameters', 5, malformed), 'GEOMETRY');
    // Correct revision/ref/hash bypasses the convenience constructor, so processing must revalidate geometry.
    const parameters = createRevision('parameters', 'shore-parameters', 5, malformed);
    const recipe = shorelineRecipe('shore', 6, {
      ...input.recipe.value,
      parameters: parameters.ref,
    });
    rejects(() => processShoreline({ ...input, parameters, recipe }), 'GEOMETRY');
    const validParameters = shorelineParameters('shore-parameters', 5, {
      ...input.parameters.value,
      geometry: withNames(['bank', 'water']),
    });
    const validRecipe = shorelineRecipe('shore', 6, {
      ...input.recipe.value,
      parameters: validParameters.ref,
    });
    const built = buildProcessedAsset(
      processShoreline({ ...input, parameters: validParameters, recipe: validRecipe }),
      'named-build',
    );
    expect(built.ir.geometry.regions.map((r) => r.name)).toEqual(['bank', 'water']);
    expect(built.ir.frames.map((p) => [...p.bytes()])).toEqual(art.expected.map((p) => p.flat()));
  });
  it.each(['ground', 'water'] as const)(
    'requires literal true for %s.opaque in rehashed IR and Built',
    (surface) => {
      const valid = processShoreline(fixture()).ir;
      for (const opaque of ['false', 1, [], {}, false, null, undefined]) {
        const value = { ...valid[surface], opaque };
        if (opaque === undefined) delete (value as { opaque?: unknown }).opaque;
        const ir = rehash({ ...valid, [surface]: value } as TileIR);
        expect(ir.contentHash).toBe(tileIRHash(ir));
        rejects(() => validateTileIR(ir), 'IR_SEMANTICS');
        rejects(
          () => buildProcessedAsset({ state: 'COMPILABLE_RECIPE', ir }, 'opaque'),
          'IR_SEMANTICS',
        );
      }
      validateTileIR(valid);
      expect(
        buildProcessedAsset({ state: 'COMPILABLE_RECIPE', ir: valid }, 'valid-opaque').ir[surface]
          .opaque,
      ).toBe(true);
    },
  );
  it.each(['ground', 'water'] as const)(
    'still rejects transparent %s pixels with valid true metadata and content hash',
    (surface) => {
      const valid = processShoreline(fixture()).ir;
      const pixels = (surface === 'ground' ? valid.groundImage : valid.frames[0]!).pixels();
      pixels.data[3] = 128;
      const image = new RgbaImage(pixels);
      const ir = rehash(
        surface === 'ground'
          ? { ...valid, groundImage: image }
          : { ...valid, frames: [image, ...valid.frames.slice(1)] },
      );
      expect(ir[surface].opaque).toBe(true);
      rejects(() => validateTileIR(ir), 'IR_ALPHA');
      rejects(() => buildProcessedAsset({ state: 'COMPILABLE_RECIPE', ir }, 'alpha'), 'IR_ALPHA');
    },
  );
  it('retains strictly typed generic loop=false and enum rejection', () => {
    const clip = {
      frameCount: 2,
      sequence: [0, 1],
      durations: [2, 3],
      timebase: 'updates' as const,
      loop: false,
    };
    expect(animationClip(clip).loop).toBe(false);
    for (const loop of ['false', 1, [], {}])
      rejects(() => animationClip({ ...clip, loop: loop as boolean }), 'ANIMATION');
    rejects(
      () => animationClip({ ...clip, timebase: ['updates'] as unknown as 'updates' }),
      'ANIMATION',
    );
    const valid = withNames(['bank', 'water']);
    rejects(
      () =>
        geometry({
          ...valid,
          regions: valid.regions.map((r) => ({ ...r, role: ['edge'] as unknown as 'edge' })),
        }),
      'GEOMETRY',
    );
  });
});
