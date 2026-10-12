import { describe, expect, it } from 'vitest';
import {
  RevisionCatalog,
  RgbaImage,
  adoptRevision,
  assessBuild,
  buildProcessedAsset,
  createRevision,
  tileIRHash,
  validateTileIR,
} from '@tileset/asset-core';
import { processShoreline, shorelineRecipe } from '../src/index.js';
import { art, fixture, source } from './fixture.js';
describe('exact immutable fixed shoreline and typed Tile IR', () => {
  it('matches independent literal ground, mask and all three output pixel planes', () => {
    const result = processShoreline(fixture());
    expect(result.state).toBe('COMPILABLE_RECIPE');
    expect([...result.ir.groundImage.bytes()]).toEqual(art.grass.flat());
    expect(result.ir.frames.map((p) => [...p.bytes()])).toEqual(art.expected.map((p) => p.flat()));
    expect([...result.ir.staticMaskImage.bytes()]).toEqual(art.mask.flat());
    expect(result.ir.dependencies).toHaveLength(9);
    expect(result.ir.transition.boundaryOwner).toBe('water');
    validateTileIR(result.ir);
  });
  it('is deterministic, owns source input and snapshots recipe/style/parameters/provenance versions', () => {
    const input = fixture(),
      first = processShoreline(input),
      second = processShoreline(input);
    input.sources[0]!.image.bytes().fill(0);
    input.sources[0]!.raw.bytes().fill(0);
    expect(second.ir.contentHash).toBe(first.ir.contentHash);
    expect(Object.isFrozen(first.ir.dependencies[0])).toBe(true);
    expect(first.ir.recipe.revision).toBe(5);
    expect(first.ir.dependencies.find((r) => r.kind === 'style')?.revision).toBe(2);
    expect(first.ir.dependencies.find((r) => r.kind === 'parameters')?.revision).toBe(4);
    expect(input.sources[0]!.raw.provenance.toolVersion).toBe('hand-selected-pixels-v1');
  });
  it('refuses missing/mismatched versions, extra sources, forged state and altered revision payload', () => {
    const input = fixture();
    expect(() => processShoreline({ ...input, sources: input.sources.slice(1) })).toThrow();
    expect(() =>
      processShoreline({
        ...input,
        sources: [source('grass', 'grass', art.grass, 4), ...input.sources.slice(1)],
      }),
    ).toThrow();
    expect(() =>
      processShoreline({ ...input, sources: [...input.sources, input.sources[0]!] }),
    ).toThrow();
    expect(() =>
      processShoreline({
        ...input,
        sources: [{ ...input.sources[0]! }, ...input.sources.slice(1)],
      }),
    ).toThrow('owned validated');
    expect(() =>
      processShoreline({
        ...input,
        parameters: {
          ...input.parameters,
          value: { ...input.parameters.value, mask: 'opposite' as 'white-static-bank' },
        },
      }),
    ).toThrow('identity');
  });
  it('requires exact dimensions/density/role and an opaque fixed output', () => {
    const input = fixture();
    const wrong = source('grass', 'grass', art.grass, 3, 1, 2, 4);
    const recipe = shorelineRecipe('shore', 6, { ...input.recipe.value, grass: wrong.ref });
    expect(() =>
      processShoreline({ ...input, recipe, sources: [wrong, ...input.sources.slice(1)] }),
    ).toThrow('geometry');
    const partial = source(
      'grass',
      'grass',
      art.grass.map((p, i) => (i === 0 ? [30, 90, 20, 128] : p)),
      3,
    );
    expect(() =>
      processShoreline({
        ...input,
        recipe: shorelineRecipe('shore', 7, { ...input.recipe.value, grass: partial.ref }),
        sources: [partial, ...input.sources.slice(1)],
      }),
    ).toThrow('opaque');
    const paletteMismatch = source(
      'grass',
      'grass',
      art.grass.map((p, i) => (i === 0 ? [99, 99, 99, 255] : p)),
      3,
    );
    expect(() =>
      processShoreline({
        ...input,
        recipe: shorelineRecipe('shore', 8, { ...input.recipe.value, grass: paletteMismatch.ref }),
        sources: [paletteMismatch, ...input.sources.slice(1)],
      }),
    ).toThrow('palette');
  });
  it('rejects nonbinary masks, bank detail outside the protected geometry and identical water frames', () => {
    const input = fixture();
    const mask = source(
      'mask',
      'static-mask',
      art.mask.map((p, i) => (i === 0 ? [128, 128, 128, 255] : p)),
      2,
    );
    expect(() =>
      processShoreline({
        ...input,
        recipe: shorelineRecipe('shore', 6, { ...input.recipe.value, staticMask: mask.ref }),
        sources: [...input.sources.slice(0, 4), mask, input.sources[5]!],
      }),
    ).toThrow('binary');
    const overlay = source(
      'bank-detail',
      'bank-overlay',
      art.overlay.map((p, i) => (i === 2 ? [180, 160, 100, 255] : p)),
    );
    expect(() =>
      processShoreline({
        ...input,
        recipe: shorelineRecipe('shore', 6, { ...input.recipe.value, bankOverlay: overlay.ref }),
        sources: [...input.sources.slice(0, 5), overlay],
      }),
    ).toThrow('interior');
    const waters = [0, 1, 2].map((i) => source(`water-${i}`, 'water', art.water[0]!));
    expect(() =>
      processShoreline({
        ...input,
        recipe: shorelineRecipe('shore', 6, {
          ...input.recipe.value,
          water: waters.map((s) => s.ref),
        }),
        sources: [input.sources[0]!, ...waters, ...input.sources.slice(4)],
      }),
    ).toThrow('actual interior');
  });
  it('hard-validates IR source geometry, exact references, hashes and fixed bank pixels', () => {
    const ir = processShoreline(fixture()).ir;
    expect(() => validateTileIR({ ...ir, contentHash: '0'.repeat(64) })).toThrow('identity');
    expect(() => validateTileIR({ ...ir, dependencies: ir.dependencies.slice(1) })).toThrow(
      'dependency',
    );
    const changed = ir.frames[1]!.pixels();
    changed.data[0] = 40;
    const altered = { ...ir, frames: [ir.frames[0]!, new RgbaImage(changed), ir.frames[2]!] };
    expect(() => validateTileIR({ ...altered, contentHash: tileIRHash(altered) })).toThrow(
      'static bank',
    );
    expect(() =>
      buildProcessedAsset({ state: 'RAW_SOURCE' as 'COMPILABLE_RECIPE', ir }, 'build'),
    ).toThrow();
  });
  it('records a processed Built artifact without claiming target compilation or native testing', () => {
    const built = buildProcessedAsset(processShoreline(fixture()), 'historical-build');
    expect(built.state).toBe('BUILT_ARTIFACT');
    expect(built.targetCompilation).toBe('NOT_EXECUTED');
    expect(built.artifactHash).toBe(built.ir.contentHash);
    expect(Object.isFrozen(built.ir.frames)).toBe(true);
  });
});
describe('new availability, explicit project adoption and historical validity are separate', () => {
  it('keeps grass@3 build valid when grass@4 exists, then marks only the adopted current dependency for rebuilding', () => {
    const input = fixture(),
      built = buildProcessedAsset(processShoreline(input), 'build-k'),
      catalog = new RevisionCatalog();
    built.ir.dependencies.forEach((ref) => catalog.publish(ref));
    const current = built.ir.dependencies;
    const grass4 = source('grass', 'grass', art.grass, 4);
    catalog.publish(grass4.ref);
    const available = assessBuild(built, catalog, current);
    expect(available.historicalValidity).toBe('VALID');
    expect(available.newerAvailable).toEqual([grass4.ref]);
    expect(available.needsRebuild).toBe(false);
    const adopted = adoptRevision(current, grass4.ref, catalog);
    const assessment = assessBuild(built, catalog, adopted);
    expect(assessment.historicalValidity).toBe('VALID');
    expect(assessment.currentMismatches).toEqual([input.sources[0]!.ref]);
    expect(assessment.needsRebuild).toBe(true);
    expect(assessBuild(built, catalog, current).needsRebuild).toBe(false);
    expect(processShoreline(input).ir.contentHash).toBe(built.artifactHash);
    const recipe6 = shorelineRecipe('shore', 6, { ...input.recipe.value, grass: grass4.ref });
    const rebuilt = processShoreline({
      ...input,
      recipe: recipe6,
      sources: [grass4, ...input.sources.slice(1)],
    });
    expect(rebuilt.ir.contentHash).not.toBe(built.ir.contentHash);
    expect(rebuilt.ir.frames.map((p) => p.pixelHash)).toEqual(
      built.ir.frames.map((p) => p.pixelHash),
    );
  });
  it('rejects revision replacement and missing adoption without damaging previous snapshots', () => {
    const built = buildProcessedAsset(processShoreline(fixture()), 'build-k'),
      catalog = new RevisionCatalog();
    built.ir.dependencies.forEach((ref) => catalog.publish(ref));
    expect(() =>
      catalog.publish({ ...built.ir.dependencies[0]!, contentHash: '0'.repeat(64) }),
    ).toThrow('replaced');
    expect(() =>
      adoptRevision(
        built.ir.dependencies,
        createRevision('style', 'missing', 1, { palette: [] }).ref,
        catalog,
      ),
    ).toThrow('unpublished');
    expect(
      assessBuild(built, new RevisionCatalog(), built.ir.dependencies).historicalValidity,
    ).toBe('MISSING_DEPENDENCY');
    expect(assessBuild(built, catalog, built.ir.dependencies).historicalValidity).toBe('VALID');
  });
});
