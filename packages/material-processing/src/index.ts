import {
  RgbaImage,
  animationClip,
  createRevision,
  freezeJson,
  geometry,
  immutableTileIR,
  isValidatedSource,
  positiveInteger,
  styleProfile,
  requireRule,
  sameRef,
  tileIRHash,
  validateDensity,
  validatePixels,
  validateRect,
  validateRef,
  validateRevision,
} from '@tileset/asset-core';
import type {
  AnimationClip,
  CompilableAsset,
  Geometry,
  Pixels,
  Rect,
  Revision,
  RevisionRef,
  StyleProfile,
  TileIR,
  ValidatedSource,
} from '@tileset/asset-core';

export const PROCESSING_VERSION = 'fixed-shoreline-v1';
export function blank(width: number, height: number): Pixels {
  positiveInteger(width, 'width');
  positiveInteger(height, 'height');
  requireRule(width * height <= 768 * 576, 'PIXEL_LIMIT', 'Output pixel budget exceeded.');
  return { width, height, data: new Uint8Array(width * height * 4) };
}
export function copyRect(source: Pixels, target: Pixels, rect: Rect, dx: number, dy: number): void {
  validatePixels(source);
  validatePixels(target);
  validateRect(rect, source.width, source.height);
  validateRect(
    { x: dx, y: dy, width: rect.width, height: rect.height },
    target.width,
    target.height,
  );
  // Unconditional owned snapshot also handles distinct Buffer views of the same ArrayBuffer.
  const bytes = new Uint8Array(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    const start = ((rect.y + y) * source.width + rect.x) * 4;
    bytes.set(source.data.subarray(start, start + rect.width * 4), y * rect.width * 4);
  }
  for (let y = 0; y < rect.height; y++)
    target.data.set(
      bytes.subarray(y * rect.width * 4, (y + 1) * rect.width * 4),
      ((dy + y) * target.width + dx) * 4,
    );
}
export function crop(source: RgbaImage, rect: Rect): RgbaImage {
  const target = blank(rect.width, rect.height);
  copyRect(source.pixels(), target, rect, 0, 0);
  return new RgbaImage(target);
}
export function resizeNearest(
  source: RgbaImage,
  request: { readonly width: number; readonly height: number; readonly method: 'nearest-explicit' },
): RgbaImage {
  requireRule(
    request.method === 'nearest-explicit',
    'RESAMPLE_REQUIRED',
    'Resampling must be explicitly nearest neighbor.',
  );
  const target = blank(request.width, request.height);
  const data = source.bytes();
  for (let y = 0; y < target.height; y++)
    for (let x = 0; x < target.width; x++) {
      const start =
        (Math.floor((y * source.height) / target.height) * source.width +
          Math.floor((x * source.width) / target.width)) *
        4;
      target.data.set(data.subarray(start, start + 4), (y * target.width + x) * 4);
    }
  return new RgbaImage(target);
}
export function scaleNearest(source: RgbaImage, factor: number): RgbaImage {
  positiveInteger(factor, 'factor');
  return resizeNearest(source, {
    width: source.width * factor,
    height: source.height * factor,
    method: 'nearest-explicit',
  });
}
function matching(a: RgbaImage, b: RgbaImage): void {
  requireRule(
    a.width === b.width && a.height === b.height,
    'DIMENSION_MISMATCH',
    'Pixel planes must have identical dimensions.',
  );
}
function linear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function srgb(value: number): number {
  const v = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}
/** Nonpremultiplied source-over in linear sRGB, with one final byte quantization. */
export function sourceOver(bottom: RgbaImage, top: RgbaImage): RgbaImage {
  matching(bottom, top);
  const b = bottom.bytes(),
    t = top.bytes(),
    output = blank(bottom.width, bottom.height);
  for (let i = 0; i < b.length; i += 4) {
    const ta = t[i + 3]! / 255,
      ba = b[i + 3]! / 255,
      alpha = ta + ba * (1 - ta);
    if (alpha === 0) continue;
    output.data[i + 3] = Math.round(alpha * 255);
    for (let c = 0; c < 3; c++)
      output.data[i + c] = srgb(
        (linear(t[i + c]!) * ta + linear(b[i + c]!) * ba * (1 - ta)) / alpha,
      );
  }
  return new RgbaImage(output);
}
export function binaryMask(mask: RgbaImage): Uint8Array {
  const input = mask.bytes(),
    result = new Uint8Array(mask.width * mask.height);
  for (let i = 0; i < result.length; i++) {
    const offset = i * 4,
      v = input[offset]!;
    requireRule(
      (v === 0 || v === 255) &&
        input[offset + 1] === v &&
        input[offset + 2] === v &&
        input[offset + 3] === 255,
      'MASK_BINARY',
      'Static mask must be opaque binary grayscale; white owns the fixed bank.',
    );
    result[i] = v === 255 ? 1 : 0;
  }
  return result;
}
export function protectStaticRegion(
  bank: RgbaImage,
  animated: RgbaImage,
  mask: RgbaImage,
): RgbaImage {
  matching(bank, animated);
  matching(bank, mask);
  const bits = binaryMask(mask),
    a = animated.bytes(),
    b = bank.bytes();
  for (let i = 0; i < bits.length; i++) if (bits[i]) a.set(b.subarray(i * 4, i * 4 + 4), i * 4);
  return new RgbaImage({ width: bank.width, height: bank.height, data: a });
}
export interface ShorelineParameters {
  readonly geometry: Geometry;
  readonly animation: AnimationClip;
  readonly composition: 'linear-srgb-source-over';
  readonly mask: 'white-static-bank';
}
export function shorelineParameters(
  id: string,
  revision: number,
  input: ShorelineParameters,
): Revision<ShorelineParameters> {
  requireRule(
    input.composition === 'linear-srgb-source-over' && input.mask === 'white-static-bank',
    'PARAMETERS',
    'Fixed recipe requires explicit composition and mask conventions.',
  );
  return createRevision('parameters', id, revision, {
    ...input,
    geometry: geometry(input.geometry),
    animation: animationClip(input.animation),
  });
}
export interface ShorelineRecipe {
  readonly version: 'fixed-shoreline-v1';
  readonly grass: RevisionRef;
  readonly water: readonly RevisionRef[];
  readonly staticMask: RevisionRef;
  readonly bankOverlay: RevisionRef;
  readonly style: RevisionRef;
  readonly parameters: RevisionRef;
}
export function shorelineRecipe(
  id: string,
  revision: number,
  input: ShorelineRecipe,
): Revision<ShorelineRecipe> {
  requireRule(
    input.version === PROCESSING_VERSION &&
      Array.isArray(input.water) &&
      input.water.length > 1 &&
      input.water.length <= 32,
    'RECIPE',
    'Fixed shore recipe needs bounded animation sources.',
  );
  for (const ref of [input.grass, ...input.water, input.staticMask, input.bankOverlay]) {
    validateRef(ref);
    requireRule(
      ref.kind === 'source',
      'RECIPE',
      'Recipe components must reference exact source revisions.',
    );
  }
  validateRef(input.style);
  validateRef(input.parameters);
  requireRule(
    input.style.kind === 'style' && input.parameters.kind === 'parameters',
    'RECIPE',
    'Style and parameter revisions must be explicit.',
  );
  return createRevision('recipe', id, revision, input);
}
function opaque(image: RgbaImage): void {
  requireRule(
    image.bytes().every((v, i) => i % 4 !== 3 || v === 255),
    'SOURCE_ALPHA',
    'Fixed grass and water sources must be opaque.',
  );
}
function palette(image: RgbaImage, style: StyleProfile): void {
  const colors = new Set(style.palette.map((c) => c.join(',')));
  const data = image.bytes();
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3])
      requireRule(
        colors.has(`${data[i]},${data[i + 1]},${data[i + 2]}`),
        'STYLE_PALETTE',
        'Source or composed pixels are outside the exact style palette.',
      );
}
export function processShoreline(input: {
  readonly recipe: Revision<ShorelineRecipe>;
  readonly sources: readonly ValidatedSource[];
  readonly style: Revision<StyleProfile>;
  readonly parameters: Revision<ShorelineParameters>;
}): CompilableAsset {
  validateRevision(input.recipe, 'recipe');
  validateRevision(input.style, 'style');
  validateRevision(input.parameters, 'parameters');
  styleProfile(input.style.ref.id, input.style.ref.revision, input.style.value);
  const r = shorelineRecipe(
    input.recipe.ref.id,
    input.recipe.ref.revision,
    input.recipe.value,
  ).value;
  const params = shorelineParameters(
    input.parameters.ref.id,
    input.parameters.ref.revision,
    input.parameters.value,
  ).value;
  requireRule(
    sameRef(r.style, input.style.ref) && sameRef(r.parameters, input.parameters.ref),
    'DEPENDENCY_MISMATCH',
    'The exact style and parameters must match the recipe.',
  );
  const scale = input.style.value.logicalPixelScale;
  positiveInteger(scale, 'density');
  const expected = [r.grass, ...r.water, r.staticMask, r.bankOverlay];
  requireRule(
    input.sources.length === expected.length &&
      new Set(expected.map((ref) => `${ref.id}@${ref.revision}`)).size === expected.length,
    'RECIPE_SOURCES',
    'Recipe sources must be distinct and exact.',
  );
  requireRule(
    input.sources.every(isValidatedSource) &&
      input.sources.reduce((sum, s) => sum + s.image.width * s.image.height * 4, 0) <=
        16 * 1024 * 1024,
    'RECIPE_BUDGET',
    'Recipe requires owned validated sources within the total pixel memory budget.',
  );
  const resolve = (ref: RevisionRef, role: string): ValidatedSource => {
    const source = input.sources.find((s) => sameRef(s.ref, ref));
    requireRule(
      source?.state === 'VALIDATED_SOURCE' &&
        source.raw.role === role &&
        source.image instanceof RgbaImage,
      'SOURCE_STATE',
      'A matching validated source component is required.',
    );
    requireRule(
      source.raw.density === scale,
      'DENSITY',
      'All sources must share the style logical pixel density.',
    );
    validateDensity(source.image, scale);
    requireRule(
      source.image.width === params.geometry.width &&
        source.image.height === params.geometry.height,
      'SOURCE_DIMENSIONS',
      'Source must match explicit recipe geometry; implicit resizing is forbidden.',
    );
    return source;
  };
  const grass = resolve(r.grass, 'grass'),
    water = r.water.map((ref) => resolve(ref, 'water')),
    mask = resolve(r.staticMask, 'static-mask'),
    overlay = resolve(r.bankOverlay, 'bank-overlay');
  requireRule(
    params.animation.frameCount === water.length,
    'RECIPE_FRAMES',
    'Animation frame count must match the bound source versions.',
  );
  opaque(grass.image);
  water.forEach((s) => opaque(s.image));
  const bits = binaryMask(mask.image),
    overlayBytes = overlay.image.bytes();
  requireRule(
    bits.some((v) => v === 1) && bits.some((v) => v === 0),
    'MASK_REGIONS',
    'Shoreline requires both fixed bank and dynamic interior regions.',
  );
  requireRule(
    bits.every((v, i) => v === 1 || overlayBytes[i * 4 + 3] === 0),
    'BANK_GEOMETRY',
    'Bank detail may not alter the dynamic interior.',
  );
  const bank = sourceOver(grass.image, overlay.image);
  palette(grass.image, input.style.value);
  water.forEach((s) => palette(s.image, input.style.value));
  palette(bank, input.style.value);
  const frames = water.map((s) => protectStaticRegion(bank, s.image, mask.image));
  requireRule(
    frames.some((frame) => frame.pixelHash !== frames[0]!.pixelHash),
    'ANIMATION_STATIC',
    'Water must have actual interior variation; identical frames are not an animated result.',
  );
  const base: Omit<TileIR, 'contentHash'> = {
    contract: 'tile-ir-v1',
    geometry: params.geometry,
    density: scale,
    ground: {
      material: { id: r.grass.id, kind: 'grass', style: r.style },
      components: [r.grass],
      opaque: true,
    },
    water: {
      material: { id: r.water[0]!.id, kind: 'water', style: r.style },
      components: r.water,
      opaque: true,
    },
    transition: {
      strategy: 'opaque-water-owned-baked-grass-bank-v1',
      boundaryOwner: 'water',
      staticMask: r.staticMask,
      bankOverlay: r.bankOverlay,
    },
    animation: params.animation,
    groundImage: grass.image,
    staticMaskImage: mask.image,
    frames: Object.freeze(frames),
    dependencies: freezeJson([...expected, r.style, r.parameters, input.recipe.ref]),
    recipe: input.recipe.ref,
  };
  const ir = immutableTileIR({ ...base, contentHash: tileIRHash(base) });
  return Object.freeze({ state: 'COMPILABLE_RECIPE', ir });
}
