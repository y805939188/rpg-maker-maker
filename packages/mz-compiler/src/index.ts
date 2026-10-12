import {
  AssetError,
  RgbaImage,
  fingerprint,
  freezeJson,
  hashBytes,
  immutableTileIR,
} from '@tileset/asset-core';
import type { RevisionRef, TileIR } from '@tileset/asset-core';
import { REGIONS, SHAPES, TARGET } from './rules.js';
export { REGIONS, TARGET } from './rules.js';
export const FRAGMENT_CONTRACT = 'mz-compiled-fragment-v1';
export const COMPILER_VERSION = 'mz-single-material-v1';
export type Category = 'a2-ground' | 'a1-water';
export class CompilationError extends Error {
  constructor(
    readonly boundary: 'ir' | 'target' | 'fragment',
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CompilationError';
  }
}
function rule(
  condition: unknown,
  boundary: CompilationError['boundary'],
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new CompilationError(boundary, code, message);
}
export interface CompiledFragment {
  readonly contract: typeof FRAGMENT_CONTRACT;
  readonly compiler: typeof COMPILER_VERSION;
  readonly target: { readonly id: string; readonly version: string };
  readonly category: Category;
  readonly source: {
    readonly irHash: string;
    readonly materialId: string;
    readonly components: readonly RevisionRef[];
    readonly recipe: RevisionRef;
    readonly parameters: RevisionRef;
    readonly dependencies: readonly RevisionRef[];
    readonly density: number;
  };
  readonly image: RgbaImage;
  readonly layout: {
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly offsets: readonly { readonly x: number; readonly y: number }[];
    readonly playback: null | {
      readonly timebase: 'updates';
      readonly sequence: readonly number[];
      readonly updatesPerState: number;
      readonly loop: true;
    };
  };
  readonly placement: {
    readonly slotClass: 'a2-ordinary-ground' | 'a1-block-d-water';
    readonly allowedKinds: readonly number[];
    readonly width: number;
    readonly height: number;
    readonly alignment: { readonly x: number; readonly y: number };
  };
  readonly contentHash: string;
}
const ownedFragments = new WeakSet<object>();
function ownIR(input: unknown): TileIR {
  try {
    rule(
      typeof input === 'object' && input !== null,
      'ir',
      'IR_INPUT',
      'Expected a Tile IR object.',
    );
    const ir = immutableTileIR(input as TileIR); // Runtime domain validation precedes target use.
    for (const image of [ir.groundImage, ir.staticMaskImage, ...ir.frames]) {
      rule(
        Object.getPrototypeOf(image) === RgbaImage.prototype &&
          hashBytes(image.bytes()) === image.pixelHash,
        'ir',
        'IR_PIXELS',
        'IR pixels must be owned RgbaImage planes with intact identity.',
      );
    }
    return ir;
  } catch (error) {
    if (error instanceof CompilationError) throw error;
    if (error instanceof AssetError) throw new CompilationError('ir', error.code, error.message);
    throw new CompilationError('ir', 'IR_INPUT', 'Tile IR fields or pixel ownership are invalid.');
  }
}
/** Copy by named semantic region, never by assumed source order or filename. */
function mapFrame(ir: TileIR, image: RgbaImage): RgbaImage {
  const data = new Uint8Array(96 * 144 * 4),
    source = image.bytes();
  for (const target of REGIONS) {
    const region = ir.geometry.regions.find((r) => r.name === target.name)!;
    for (let y = 0; y < 24; y++) {
      const start = ((region.rect.y + y) * image.width + region.rect.x) * 4;
      data.set(source.subarray(start, start + 24 * 4), ((target.y + y) * 96 + target.x) * 4);
    }
  }
  return new RgbaImage({ width: 96, height: 144, data });
}
function targetIR(ir: TileIR, category: Category): void {
  const g = ir.geometry;
  rule(
    g.width === 96 && g.height === 144 && g.tileWidth === 48 && g.tileHeight === 48,
    'target',
    'MZ_GEOMETRY',
    'Native Profile requires 96×144 source geometry and 48×48 tiles.',
  );
  rule(
    TARGET.densities.includes(ir.density),
    'target',
    'MZ_DENSITY',
    'Native Profile supports density 1 diagnostics or density 2 artwork.',
  );
  rule(
    g.regions.length === REGIONS.length &&
      REGIONS.every((expected) => {
        const r = g.regions.find((r) => r.name === expected.name);
        return (
          r?.role === expected.role &&
          r.rect.width === 24 &&
          r.rect.height === 24 &&
          r.rect.x % 24 === 0 &&
          r.rect.y % 24 === 0
        );
      }),
    'target',
    'MZ_REGIONS',
    'Native quarter regions require explicit direction names, roles and 24px alignment.',
  );
  if (category === 'a1-water') {
    const a = ir.animation;
    rule(
      a.frameCount === TARGET.animation.sourceFrames &&
        a.timebase === 'updates' &&
        a.loop === true &&
        a.sequence.length === TARGET.animation.sequence.length &&
        a.sequence.every((v, i) => v === TARGET.animation.sequence[i]) &&
        a.durations.length === TARGET.animation.sequence.length &&
        a.durations.every((v) => v === TARGET.animation.updatesPerState),
      'target',
      'MZ_ANIMATION',
      'Native water requires three frames and looping 0→1→2→1, each 30 updates.',
    );
    rule(
      mapFrame(ir, ir.staticMaskImage).pixelHash === TARGET.maskPixelHash,
      'target',
      'MZ_SHORELINE',
      'Native water requires the retained fixed bank mask in semantic quarter order.',
    );
  }
}
function layout(category: Category): CompiledFragment['layout'] {
  return {
    frameWidth: 96,
    frameHeight: 144,
    offsets: (category === 'a1-water' ? [0, 96, 192] : [0]).map((x) => ({ x, y: 0 })),
    playback:
      category === 'a1-water'
        ? {
            timebase: 'updates',
            sequence: TARGET.animation.sequence,
            updatesPerState: TARGET.animation.updatesPerState,
            loop: true,
          }
        : null,
  };
}
function placement(category: Category): CompiledFragment['placement'] {
  return {
    slotClass: category === 'a1-water' ? 'a1-block-d-water' : 'a2-ordinary-ground',
    allowedKinds: category === 'a1-water' ? TARGET.waterKinds : TARGET.groundKinds,
    width: category === 'a1-water' ? 288 : 96,
    height: 144,
    alignment: { x: 96, y: 144 },
  };
}
function fragmentHash(fragment: Omit<CompiledFragment, 'contentHash'>): string {
  const { image, contract, compiler, target, category, source, layout, placement } = fragment;
  return fingerprint({
    contract,
    compiler,
    target,
    category,
    source,
    layout,
    placement,
    pixels: { width: image.width, height: image.height, pixelHash: image.pixelHash },
  });
}
export function compileFragment(input: unknown, category: Category): CompiledFragment {
  rule(
    category === 'a1-water' || category === 'a2-ground',
    'target',
    'MZ_CATEGORY',
    'Only A2 ordinary ground and A1 Block D water are supported.',
  );
  const ir = ownIR(input);
  targetIR(ir, category);
  const planes = (category === 'a1-water' ? ir.frames : [ir.groundImage]).map((image) =>
    mapFrame(ir, image),
  );
  const width = planes.length * 96,
    data = new Uint8Array(width * 144 * 4);
  planes.forEach((plane, i) => {
    const bytes = plane.bytes();
    for (let y = 0; y < 144; y++)
      data.set(bytes.subarray(y * 96 * 4, (y + 1) * 96 * 4), (y * width + i * 96) * 4);
  });
  const surface = category === 'a1-water' ? ir.water : ir.ground;
  const base: Omit<CompiledFragment, 'contentHash'> = {
    ...freezeJson({
      contract: FRAGMENT_CONTRACT,
      compiler: COMPILER_VERSION,
      target: { id: TARGET.id, version: TARGET.version },
      category,
      source: {
        irHash: ir.contentHash,
        materialId: surface.material.id,
        components: surface.components,
        recipe: ir.recipe,
        parameters: ir.parameters,
        dependencies: ir.dependencies,
        density: ir.density,
      },
      layout: layout(category),
      placement: placement(category),
    }),
    image: new RgbaImage({ width, height: 144, data }),
  };
  const fragment = Object.freeze({ ...base, contentHash: fragmentHash(base) });
  ownedFragments.add(fragment);
  validateFragment(fragment);
  return fragment;
}
export function validateFragment(input: unknown): asserts input is CompiledFragment {
  rule(
    typeof input === 'object' && input !== null && ownedFragments.has(input),
    'fragment',
    'FRAGMENT_OWNERSHIP',
    'Expected a Compiler-owned fragment; JSON is not an executed compilation.',
  );
  const f = input as CompiledFragment;
  rule(
    f.contract === FRAGMENT_CONTRACT &&
      f.compiler === COMPILER_VERSION &&
      f.target.id === TARGET.id &&
      f.target.version === TARGET.version &&
      (f.category === 'a1-water' || f.category === 'a2-ground') &&
      f.image instanceof RgbaImage &&
      f.image.width === f.placement.width &&
      f.image.height === 144 &&
      hashBytes(f.image.bytes()) === f.image.pixelHash &&
      f.image.bytes().every((v, i) => i % 4 !== 3 || v === 255) &&
      fingerprint(f.layout) === fingerprint(layout(f.category)) &&
      fingerprint(f.placement) === fingerprint(placement(f.category)) &&
      f.contentHash === fragmentHash(f),
    'fragment',
    'FRAGMENT_CONTENT',
    'Fragment content, layout and identity must agree.',
  );
}
export function sourceFrameAtUpdate(updateCount: number): number {
  rule(
    Number.isSafeInteger(updateCount) && updateCount >= 0,
    'target',
    'MZ_UPDATE',
    'Animation update count must be a non-negative safe integer.',
  );
  return TARGET.animation.sequence[
    Math.floor(updateCount / TARGET.animation.updatesPerState) % TARGET.animation.sequence.length
  ]!;
}
/** All 47 connected shapes plus the separately identified representative index 47. */
export function renderShape(input: unknown, shape: number, updateCount = 0): RgbaImage {
  validateFragment(input);
  rule(
    Number.isSafeInteger(shape) && shape >= 0 && shape < 48,
    'target',
    'MZ_SHAPE',
    'Shape must be a supported index 0–47; 47 is representative.',
  );
  const frame = sourceFrameAtUpdate(updateCount);
  const f = input,
    source = f.image.bytes(),
    data = new Uint8Array(48 * 48 * 4);
  const offset = f.layout.offsets[f.category === 'a1-water' ? frame : 0]!;
  SHAPES[shape]!.forEach((quarter, i) => {
    const sx = offset.x + (quarter % 4) * 24,
      sy = offset.y + Math.floor(quarter / 4) * 24;
    for (let y = 0; y < 24; y++) {
      const start = ((sy + y) * f.image.width + sx) * 4;
      data.set(
        source.subarray(start, start + 24 * 4),
        ((Math.floor(i / 2) * 24 + y) * 48 + (i % 2) * 24) * 4,
      );
    }
  });
  return new RgbaImage({ width: 48, height: 48, data });
}
