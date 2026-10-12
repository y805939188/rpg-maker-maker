import { describe, expect, it } from 'vitest';
import {
  RgbaImage,
  RevisionCatalog,
  adoptRevision,
  assessBuild,
  buildProcessedAsset,
  createRevision,
  tileIRHash,
  validateTileIR,
} from '@tileset/asset-core';
import type { AnimationClip, RevisionRef, TileIR } from '@tileset/asset-core';
import { processShoreline, shorelineParameters, shorelineRecipe } from '../src/index.js';
import { art, fixture, source } from './fixture.js';

function withAnimation(sequence: number[], durations = sequence.map(() => 30), loop = true) {
  const input = fixture();
  const parameters = shorelineParameters('shore-parameters', 4, {
    ...input.parameters.value,
    animation: { ...input.parameters.value.animation, sequence, durations, loop },
  });
  return {
    ...input,
    parameters,
    recipe: shorelineRecipe('shore', 5, { ...input.recipe.value, parameters: parameters.ref }),
  };
}
function rehash(ir: TileIR): TileIR {
  return { ...ir, contentHash: tileIRHash(ir) };
}

describe('STEP03-R1-002: parameter identity remains in the hard dependency closure', () => {
  it('rejects omitted parameter dependencies even when the remaining IR hash is recomputed', () => {
    const ir = processShoreline(fixture()).ir;
    const truncated = rehash({
      ...ir,
      dependencies: ir.dependencies.filter((r) => r.kind !== 'parameters'),
    });
    expect(() => validateTileIR(truncated)).toThrow();
    expect(() =>
      buildProcessedAsset({ state: 'COMPILABLE_RECIPE', ir: truncated }, 'truncated'),
    ).toThrow();
  });
  it('binds parameters explicitly and rejects the wrong revision or kind', () => {
    const input = fixture(),
      ir = processShoreline(input).ir;
    expect(ir).toMatchObject({ parameters: input.parameters.ref });
    const wrong = createRevision('parameters', 'shore-parameters', 5, input.parameters.value).ref;
    expect(() => validateTileIR(rehash({ ...ir, parameters: wrong } as TileIR))).toThrow();
    expect(() =>
      validateTileIR(rehash({ ...ir, parameters: input.style.ref } as TileIR)),
    ).toThrow();
    const missing = { ...ir } as TileIR & { parameters?: RevisionRef };
    delete (missing as { parameters?: RevisionRef }).parameters;
    expect(() => validateTileIR(missing)).toThrow();
  });
  it('reports absent historical parameters and explicit parameter adoption separately', () => {
    const input = fixture(),
      built = buildProcessedAsset(processShoreline(input), 'parameter-build');
    const incomplete = new RevisionCatalog();
    built.ir.dependencies
      .filter((r) => r.kind !== 'parameters')
      .forEach((r) => incomplete.publish(r));
    expect(assessBuild(built, incomplete, built.ir.dependencies).historicalValidity).toBe(
      'MISSING_DEPENDENCY',
    );
    const catalog = new RevisionCatalog();
    built.ir.dependencies.forEach((r) => catalog.publish(r));
    const next = shorelineParameters('shore-parameters', 5, {
      ...input.parameters.value,
      animation: { ...input.parameters.value.animation, durations: [31, 30, 30, 30] },
    });
    catalog.publish(next.ref);
    expect(assessBuild(built, catalog, built.ir.dependencies)).toMatchObject({
      historicalValidity: 'VALID',
      needsRebuild: false,
    });
    const adopted = adoptRevision(built.ir.dependencies, next.ref, catalog);
    expect(assessBuild(built, catalog, adopted)).toMatchObject({
      historicalValidity: 'VALID',
      needsRebuild: true,
      currentMismatches: [input.parameters.ref],
    });
    expect(assessBuild(built, catalog, built.ir.dependencies).needsRebuild).toBe(false);
  });
});
describe('STEP03-R1-003: one adopted revision per logical identity', () => {
  it('rejects multiple source revisions under one ID before a recipe becomes Compilable', () => {
    const input = fixture(),
      water = art.water.map((p, i) => source('water', 'water', p, i + 1));
    expect(() => {
      const recipe = shorelineRecipe('shore', 6, {
        ...input.recipe.value,
        water: water.map((s) => s.ref),
      });
      return processShoreline({
        ...input,
        recipe,
        sources: [input.sources[0]!, ...water, ...input.sources.slice(4)],
      });
    }).toThrow();
  });
  it('rejects conflicting current adoption and hard IR identities rather than returning false mismatches', () => {
    const input = fixture(),
      built = buildProcessedAsset(processShoreline(input), 'consistent-build');
    const catalog = new RevisionCatalog();
    built.ir.dependencies.forEach((r) => catalog.publish(r));
    const next = source('grass', 'grass', art.grass, 4);
    catalog.publish(next.ref);
    const conflict = [...built.ir.dependencies, next.ref];
    expect(() => assessBuild(built, catalog, conflict)).toThrow();
    expect(() => adoptRevision(conflict, next.ref, catalog)).toThrow();
    expect(() => validateTileIR(rehash({ ...built.ir, dependencies: conflict }))).toThrow();
    expect(assessBuild(built, catalog, built.ir.dependencies).needsRebuild).toBe(false);
    expect(
      assessBuild(built, catalog, adoptRevision(built.ir.dependencies, next.ref, catalog)),
    ).toMatchObject({ historicalValidity: 'VALID', needsRebuild: true });
  });
});
describe('STEP03-R1-004: the visible overlay source must itself satisfy the palette', () => {
  function partialOverlay(allowRed: boolean) {
    const input = fixture(),
      overlay = source(
        'bank-detail',
        'bank-overlay',
        art.overlay.map((p, i) => (i === 1 ? [255, 0, 0, 1] : p)),
      );
    const style = createRevision('style', 'style', 3, {
      ...input.style.value,
      palette: [
        ...art.palette,
        [44, 100, 30] as [number, number, number],
        ...(allowRed ? [[255, 0, 0] as [number, number, number]] : []),
      ],
    });
    const recipe = shorelineRecipe('shore', 6, {
      ...input.recipe.value,
      bankOverlay: overlay.ref,
      style: style.ref,
    });
    return { ...input, style, recipe, sources: [...input.sources.slice(0, 5), overlay] };
  }
  it('rejects literal out-of-palette red alpha1 even though its independently calculated composite is allowed', () => {
    expect(() => processShoreline(partialOverlay(false))).toThrow('palette');
  });
  it('accepts an in-palette partial source and composite while transparent-zero remains allowed', () => {
    const result = processShoreline(partialOverlay(true));
    expect([...result.ir.frames[0]!.bytes().slice(4, 8)]).toEqual([44, 100, 30, 255]);
    expect(processShoreline(fixture()).ir.frames.map((p) => [...p.bytes()])).toEqual(
      art.expected.map((p) => p.flat()),
    );
  });
});
describe('STEP03-R1-005: animation variation must be reachable in its declared playback', () => {
  it('rejects unplayed variation at both recipe and independently rehashed IR boundaries', () => {
    expect(() => processShoreline(withAnimation([0]))).toThrow();
    const ir = processShoreline(fixture()).ir;
    const animation: AnimationClip = { ...ir.animation, sequence: [0], durations: [30] };
    expect(() => validateTileIR(rehash({ ...ir, animation }))).toThrow();
  });
  it('rejects played distinct references with equal pixels even when an unused frame varies', () => {
    const input = withAnimation([0, 1]),
      water = [
        source('water-0', 'water', art.water[0]!),
        source('water-1', 'water', art.water[0]!),
        source('water-2', 'water', art.water[2]!),
      ];
    const recipe = shorelineRecipe('shore', 6, {
      ...input.recipe.value,
      water: water.map((s) => s.ref),
    });
    expect(() =>
      processShoreline({
        ...input,
        recipe,
        sources: [input.sources[0]!, ...water, ...input.sources.slice(4)],
      }),
    ).toThrow();
    const ir = processShoreline(fixture()).ir;
    expect(() =>
      validateTileIR(
        rehash({
          ...ir,
          animation: { ...ir.animation, sequence: [0, 1], durations: [30, 30] },
          frames: [ir.frames[0]!, new RgbaImage(ir.frames[0]!.pixels()), ir.frames[2]!],
        }),
      ),
    ).toThrow();
  });
  it('accepts truly varying selected frames with unused generic frames and nonlooping playback', () => {
    const result = processShoreline(withAnimation([0, 2], [10, 20], false));
    expect(buildProcessedAsset(result, 'varied-playback').state).toBe('BUILT_ARTIFACT');
    expect(result.ir.frames.map((p) => [...p.bytes()])).toEqual(art.expected.map((p) => p.flat()));
  });
});
