import { createHash } from 'node:crypto';

export const DOMAIN_CONTRACT = 'asset-revision-v1';
export const PIXEL_CONTRACT = 'rgba8-srgb-integer-v1';
export const MAX_PIXELS = 768 * 576;
export const MAX_ENCODED_BYTES = 4 * 1024 * 1024;

export class AssetError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AssetError';
  }
}
export function requireRule(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new AssetError(code, message);
}
export function positiveInteger(value: number, field: string): void {
  requireRule(
    Number.isSafeInteger(value) && value > 0,
    'INTEGER_REQUIRED',
    `${field} must be a positive safe integer.`,
  );
}
export interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}
export function validatePixels(p: Pixels): void {
  positiveInteger(p.width, 'width');
  positiveInteger(p.height, 'height');
  requireRule(p.width * p.height <= MAX_PIXELS, 'PIXEL_LIMIT', 'Decoded pixel budget exceeded.');
  requireRule(
    p.data instanceof Uint8Array && p.data.byteLength === p.width * p.height * 4,
    'RGBA_LENGTH',
    'RGBA8 byte length must match dimensions.',
  );
  for (let i = 0; i < p.data.length; i += 4)
    requireRule(
      p.data[i + 3] !== 0 || !(p.data[i] || p.data[i + 1] || p.data[i + 2]),
      'HIDDEN_RGB',
      'Transparent pixels must have zero RGB.',
    );
}
/** An owned, immutable pixel plane. Neither input buffers nor returned copies can mutate it. */
export class RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly pixelHash: string;
  #bytes: Uint8Array;
  constructor(p: Pixels) {
    validatePixels(p);
    this.width = p.width;
    this.height = p.height;
    this.#bytes = new Uint8Array(p.data);
    this.pixelHash = hashBytes(this.#bytes);
    Object.freeze(this);
  }
  bytes(): Uint8Array {
    return new Uint8Array(this.#bytes);
  }
  pixels(): Pixels {
    return { width: this.width, height: this.height, data: this.bytes() };
  }
}
export function hashBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };
/** An absent index or explicit undefined is never an owned JSON/semantic array value. */
export function requireDenseArray(
  value: unknown,
  field: string,
  code = 'ARRAY_DENSE',
): asserts value is readonly unknown[] {
  requireRule(Array.isArray(value), code, `${field} must be an array.`);
  for (let i = 0; i < value.length; i++)
    requireRule(
      Object.hasOwn(value, i) && value[i] !== undefined,
      code,
      `${field} must contain an explicit value at every index.`,
    );
}
/** Copy all mutable input, reject non-JSON values and use sorted keys for reproducible identity. */
export function freezeJson<T>(value: T): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    requireRule(Number.isFinite(value), 'INVALID_METADATA', 'Metadata numbers must be finite.');
    return value;
  }
  if (Array.isArray(value)) {
    requireDenseArray(value, 'JSON array', 'INVALID_METADATA');
    const owned: unknown[] = [];
    for (let i = 0; i < value.length; i++) owned.push(freezeJson(value[i]));
    return Object.freeze(owned) as T;
  }
  requireRule(
    typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype,
    'INVALID_METADATA',
    'Metadata must contain only plain JSON values.',
  );
  return Object.freeze(
    Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, freezeJson((value as Record<string, unknown>)[key])]),
    ),
  ) as T;
}
export function fingerprint(value: unknown): string {
  return hashBytes(new TextEncoder().encode(JSON.stringify(freezeJson(value))));
}
export type RevisionKind = 'source' | 'style' | 'parameters' | 'recipe';
export interface RevisionRef {
  readonly kind: RevisionKind;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
}
export function validateRef(ref: RevisionRef): void {
  requireRule(
    typeof ref === 'object' && ref !== null,
    'REVISION_ID',
    'Expected a revision reference.',
  );
  requireRule(
    ['source', 'style', 'parameters', 'recipe'].includes(ref.kind) &&
      typeof ref.id === 'string' &&
      /^[a-z][a-z0-9-]{0,63}$/.test(ref.id),
    'REVISION_ID',
    'Invalid revision identity.',
  );
  positiveInteger(ref.revision, 'revision');
  requireRule(
    typeof ref.contentHash === 'string' && /^[a-f0-9]{64}$/.test(ref.contentHash),
    'REVISION_HASH',
    'Expected SHA-256 content identity.',
  );
}
export function sameRef(a: RevisionRef, b: RevisionRef): boolean {
  return (
    a.kind === b.kind &&
    a.id === b.id &&
    a.revision === b.revision &&
    a.contentHash === b.contentHash
  );
}
export function refKey(ref: RevisionRef): string {
  validateRef(ref);
  return `${ref.kind}:${ref.id}@${ref.revision}`;
}
/** A current recipe/project can select one revision of each kind+logical ID. The catalog retains all historical versions. */
export function validateAdoptionIdentities(refs: readonly RevisionRef[]): void {
  requireDenseArray(refs, 'Revision selection');
  const identities = new Set<string>();
  for (const ref of refs) {
    validateRef(ref);
    const identity = `${ref.kind}:${ref.id}`;
    requireRule(
      !identities.has(identity),
      'REVISION_IDENTITY_CONFLICT',
      'A recipe or current adoption must select only one revision per logical identity.',
    );
    identities.add(identity);
  }
}
export interface Revision<T> {
  readonly ref: RevisionRef;
  readonly value: T;
}
export function validateRevision<T>(revision: Revision<T>, kind: RevisionKind): void {
  validateRef(revision.ref);
  requireRule(
    revision.ref.kind === kind && fingerprint(revision.value) === revision.ref.contentHash,
    'REVISION_CONTENT',
    'Revision content must match its declared immutable identity.',
  );
}
export function createRevision<T>(
  kind: RevisionKind,
  id: string,
  revision: number,
  value: T,
): Revision<T> {
  const owned = freezeJson(value);
  const ref = Object.freeze({ kind, id, revision, contentHash: fingerprint(owned) });
  validateRef(ref);
  return Object.freeze({ ref, value: owned });
}
export interface Provenance {
  readonly origin: 'manual' | 'deterministic' | 'ai';
  readonly author: string;
  readonly license: string;
  readonly toolVersion: string;
  readonly parents: readonly RevisionRef[];
}
export type SourceRole = 'grass' | 'water' | 'static-mask' | 'bank-overlay';
export class RawSource {
  readonly state = 'RAW_SOURCE';
  readonly ref: RevisionRef;
  readonly encodedHash: string;
  readonly role: SourceRole;
  readonly density: number;
  readonly provenance: Provenance;
  readonly encoding: 'png' | 'rgba8';
  #bytes: Uint8Array;
  constructor(input: {
    id: string;
    revision: number;
    role: SourceRole;
    density: number;
    encoding: 'png' | 'rgba8';
    bytes: Uint8Array;
    provenance: Provenance;
  }) {
    requireRule(
      input.bytes instanceof Uint8Array &&
        input.bytes.length > 0 &&
        input.bytes.length <= MAX_ENCODED_BYTES,
      'ENCODED_LIMIT',
      'Source must fit the encoded byte budget.',
    );
    requireRule(
      ['grass', 'water', 'static-mask', 'bank-overlay'].includes(input.role),
      'SOURCE_ROLE',
      'Unsupported source component role.',
    );
    requireRule(
      ['png', 'rgba8'].includes(input.encoding),
      'SOURCE_ENCODING',
      'Unsupported source representation.',
    );
    positiveInteger(input.density, 'density');
    requireRule(
      input.density <= 48,
      'DENSITY',
      'Logical pixel density exceeds the supported bound.',
    );
    const p = input.provenance;
    requireRule(
      ['manual', 'deterministic', 'ai'].includes(p.origin) &&
        [p.author, p.license, p.toolVersion].every(
          (v) => typeof v === 'string' && v.length > 0 && v.length <= 256,
        ),
      'PROVENANCE',
      'Source provenance must be explicit.',
    );
    requireRule(
      Array.isArray(p.parents) && p.parents.length <= 32,
      'PROVENANCE',
      'Invalid provenance dependencies.',
    );
    requireDenseArray(p.parents, 'provenance parents', 'PROVENANCE');
    p.parents.forEach(validateRef);
    this.#bytes = new Uint8Array(input.bytes);
    this.encodedHash = hashBytes(this.#bytes);
    this.role = input.role;
    this.density = input.density;
    this.encoding = input.encoding;
    this.provenance = freezeJson(p);
    this.ref = createRevision('source', input.id, input.revision, {
      encodedHash: this.encodedHash,
      role: this.role,
      density: this.density,
      encoding: this.encoding,
      provenance: this.provenance,
    }).ref;
    Object.freeze(this);
  }
  bytes(): Uint8Array {
    return new Uint8Array(this.#bytes);
  }
}
export interface ValidatedSource {
  readonly state: 'VALIDATED_SOURCE';
  readonly raw: RawSource;
  readonly ref: RevisionRef;
  readonly image: RgbaImage;
  readonly validationHash: string;
}
const validatedSources = new WeakSet<object>();
export function isValidatedSource(source: unknown): source is ValidatedSource {
  return typeof source === 'object' && source !== null && validatedSources.has(source);
}
export function validateDensity(image: RgbaImage, density: number): void {
  positiveInteger(density, 'density');
  requireRule(
    image.width % density === 0 && image.height % density === 0,
    'DENSITY',
    'Dimensions must be divisible by logical pixel density.',
  );
  const data = image.bytes();
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const from =
        (Math.floor(y / density) * density * image.width + Math.floor(x / density) * density) * 4;
      const to = (y * image.width + x) * 4;
      requireRule(
        [0, 1, 2, 3].every((c) => data[from + c] === data[to + c]),
        'DENSITY',
        'Pixels do not match the declared logical density.',
      );
    }
}
/** Infrastructure must actually decode PNG bytes; this constructor validates the resulting plane. */
export function validatedDecodedSource(raw: RawSource, pixels: Pixels): ValidatedSource {
  requireRule(raw instanceof RawSource, 'SOURCE_STATE', 'Expected an owned RawSource.');
  const image = new RgbaImage(pixels);
  validateDensity(image, raw.density);
  if (raw.encoding === 'rgba8')
    requireRule(
      hashBytes(raw.bytes()) === image.pixelHash,
      'SOURCE_PIXEL_MISMATCH',
      'Raw RGBA and validated pixels differ.',
    );
  const source = Object.freeze({
    state: 'VALIDATED_SOURCE' as const,
    raw,
    ref: raw.ref,
    image,
    validationHash: fingerprint({
      source: raw.ref,
      pixelHash: image.pixelHash,
      width: image.width,
      height: image.height,
      contract: PIXEL_CONTRACT,
    }),
  });
  validatedSources.add(source);
  return source;
}
export interface AnimationClip {
  readonly frameCount: number;
  readonly sequence: readonly number[];
  readonly durations: readonly number[];
  readonly timebase: 'updates' | 'milliseconds';
  readonly loop: boolean;
}
export function animationClip(input: AnimationClip): AnimationClip {
  positiveInteger(input.frameCount, 'frameCount');
  requireRule(input.frameCount <= 32, 'ANIMATION', 'At most 32 generic frames are supported.');
  requireRule(
    ['updates', 'milliseconds'].includes(input.timebase) && typeof input.loop === 'boolean',
    'ANIMATION',
    'Invalid animation timebase or loop.',
  );
  requireRule(
    Array.isArray(input.sequence) &&
      input.sequence.length > 0 &&
      input.sequence.length <= 128 &&
      Array.isArray(input.durations) &&
      input.durations.length === input.sequence.length,
    'ANIMATION',
    'Animation sequence and durations must correspond.',
  );
  requireDenseArray(input.sequence, 'animation sequence', 'ANIMATION');
  requireDenseArray(input.durations, 'animation durations', 'ANIMATION');
  let cycle = 0;
  for (let i = 0; i < input.sequence.length; i++) {
    const index = input.sequence[i]!;
    requireRule(
      Number.isSafeInteger(index) && index >= 0 && index < input.frameCount,
      'ANIMATION',
      'Animation frame index is out of range.',
    );
    const duration = input.durations[i]!;
    positiveInteger(duration, 'duration');
    cycle += duration;
  }
  requireRule(
    Number.isSafeInteger(cycle),
    'ANIMATION',
    'Animation cycle exceeds safe integer range.',
  );
  return freezeJson(input);
}
export function frameAt(clip: AnimationClip, time: number): number {
  const owned = animationClip(clip);
  requireRule(
    Number.isSafeInteger(time) && time >= 0,
    'ANIMATION',
    'Animation time must be a nonnegative integer.',
  );
  const total = owned.durations.reduce((sum, v) => sum + v, 0);
  requireRule(
    Number.isSafeInteger(total),
    'ANIMATION',
    'Animation cycle exceeds safe integer range.',
  );
  let t = owned.loop ? time % total : Math.min(time, total - 1);
  for (let i = 0; i < owned.sequence.length; i++) {
    if (t < owned.durations[i]!) return owned.sequence[i]!;
    t -= owned.durations[i]!;
  }
  throw new AssetError('ANIMATION', 'Invalid animation.');
}
/** Generic clips may retain unused frames; fixed animated assets require pixel change among selected frames. */
export function playbackVaries(frames: readonly RgbaImage[], input: AnimationClip): boolean {
  const clip = animationClip(input);
  requireDenseArray(frames, 'animation frames', 'IR_FRAMES');
  requireRule(
    frames.length === clip.frameCount && frames.every((frame) => frame instanceof RgbaImage),
    'IR_FRAMES',
    'Animation frames must match the clip.',
  );
  const first = frames[clip.sequence[0]!]!.pixelHash;
  return clip.sequence.some((index) => frames[index]!.pixelHash !== first);
}
export interface StyleProfile {
  readonly logicalPixelScale: number;
  readonly palette: readonly (readonly [number, number, number])[];
  readonly lighting: 'flat' | 'top-left';
  readonly outline: 'none' | 'dark';
}
export function styleProfile(
  id: string,
  revision: number,
  value: StyleProfile,
): Revision<StyleProfile> {
  requireDenseArray(value.palette, 'style palette', 'STYLE');
  value.palette.forEach((color) => requireDenseArray(color, 'style palette color', 'STYLE'));
  positiveInteger(value.logicalPixelScale, 'logicalPixelScale');
  requireRule(
    value.logicalPixelScale <= 48 &&
      ['flat', 'top-left'].includes(value.lighting) &&
      ['none', 'dark'].includes(value.outline),
    'STYLE',
    'Unsupported style constraints.',
  );
  requireRule(
    Array.isArray(value.palette) &&
      value.palette.length > 0 &&
      value.palette.length <= 256 &&
      value.palette.every(
        (c) =>
          Array.isArray(c) &&
          c.length === 3 &&
          c.every((v) => Number.isInteger(v) && v >= 0 && v <= 255),
      ),
    'STYLE',
    'Style palette requires RGB8 entries.',
  );
  return createRevision('style', id, revision, value);
}
export interface Material {
  readonly id: string;
  readonly kind: 'grass' | 'water';
  readonly style: RevisionRef;
}
export interface Surface {
  readonly material: Material;
  readonly components: readonly RevisionRef[];
  readonly opaque: boolean;
}
export interface Transition {
  readonly strategy: 'opaque-water-owned-baked-grass-bank-v1';
  readonly boundaryOwner: 'water';
  readonly staticMask: RevisionRef;
  readonly bankOverlay: RevisionRef;
}
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface TileRegion {
  readonly name: string;
  readonly role: 'center' | 'edge' | 'outer-corner' | 'inner-corner';
  readonly rect: Rect;
}
export interface Geometry {
  readonly width: number;
  readonly height: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly regions: readonly TileRegion[];
}
export function validateRect(rect: Rect, width: number, height: number): void {
  positiveInteger(rect.width, 'rect.width');
  positiveInteger(rect.height, 'rect.height');
  requireRule(
    [rect.x, rect.y].every((v) => Number.isSafeInteger(v) && v >= 0) &&
      rect.x + rect.width <= width &&
      rect.y + rect.height <= height,
    'RECT_BOUNDS',
    'Integer half-open rectangle must be inside the image.',
  );
}
export function geometry(input: Geometry): Geometry {
  [input.width, input.height, input.tileWidth, input.tileHeight].forEach((v) =>
    positiveInteger(v, 'geometry'),
  );
  requireRule(
    input.width * input.height <= MAX_PIXELS &&
      input.width % input.tileWidth === 0 &&
      input.height % input.tileHeight === 0,
    'GEOMETRY',
    'Template dimensions must be integral tile multiples within budget.',
  );
  requireRule(
    Array.isArray(input.regions) && input.regions.length > 0 && input.regions.length <= 256,
    'GEOMETRY',
    'Geometry requires explicit semantic regions.',
  );
  requireDenseArray(input.regions, 'geometry regions', 'GEOMETRY');
  const names = new Set<string>();
  const coverage = new Uint8Array(input.width * input.height);
  for (const region of input.regions) {
    requireRule(
      /^[a-z][a-z0-9-]{0,63}$/.test(region.name) &&
        !names.has(region.name) &&
        ['center', 'edge', 'outer-corner', 'inner-corner'].includes(region.role),
      'GEOMETRY',
      'Region names must be unique with valid semantic roles.',
    );
    names.add(region.name);
    validateRect(region.rect, input.width, input.height);
    for (let y = region.rect.y; y < region.rect.y + region.rect.height; y++)
      for (let x = region.rect.x; x < region.rect.x + region.rect.width; x++) {
        requireRule(
          coverage[y * input.width + x] === 0,
          'GEOMETRY_OVERLAP',
          'Semantic regions overlap.',
        );
        coverage[y * input.width + x] = 1;
      }
  }
  requireRule(
    coverage.every((v) => v === 1),
    'GEOMETRY_GAP',
    'Semantic regions must cover the template.',
  );
  return freezeJson(input);
}
export interface TileIR {
  readonly contract: 'tile-ir-v1';
  readonly geometry: Geometry;
  readonly density: number;
  readonly ground: Surface;
  readonly water: Surface;
  readonly transition: Transition;
  readonly animation: AnimationClip;
  readonly groundImage: RgbaImage;
  readonly staticMaskImage: RgbaImage;
  readonly frames: readonly RgbaImage[];
  readonly dependencies: readonly RevisionRef[];
  readonly recipe: RevisionRef;
  readonly parameters: RevisionRef;
  readonly contentHash: string;
}
export function validateTileIR(ir: TileIR): void {
  requireRule(ir.contract === 'tile-ir-v1', 'IR_CONTRACT', 'Unsupported Tile IR.');
  requireDenseArray(ir.frames, 'IR frames', 'IR_FRAMES');
  requireDenseArray(ir.ground.components, 'ground components', 'IR_SEMANTICS');
  requireDenseArray(ir.water.components, 'water components', 'IR_SEMANTICS');
  validateAdoptionIdentities(ir.dependencies);
  requireRule(
    ir.parameters?.kind === 'parameters',
    'IR_PARAMETERS',
    'IR must bind an exact parameter revision.',
  );
  validateRef(ir.parameters);
  const g = geometry(ir.geometry);
  const clip = animationClip(ir.animation);
  requireRule(
    ir.ground.material.kind === 'grass' &&
      ir.water.material.kind === 'water' &&
      ir.ground.opaque &&
      ir.water.opaque &&
      ir.transition.strategy === 'opaque-water-owned-baked-grass-bank-v1' &&
      ir.transition.boundaryOwner === 'water',
    'IR_SEMANTICS',
    'Invalid fixed shoreline surface ownership.',
  );
  requireRule(
    sameRef(ir.ground.material.style, ir.water.material.style) &&
      ir.ground.material.style.kind === 'style',
    'IR_STYLE',
    'Surfaces must share one exact style.',
  );
  requireRule(
    ir.recipe.kind === 'recipe' && ir.frames.length === clip.frameCount,
    'IR_FRAMES',
    'Recipe and animation frames must correspond.',
  );
  requireRule(
    ir.ground.components.length === 1 &&
      ir.water.components.length === clip.frameCount &&
      ir.ground.material.id === ir.ground.components[0]?.id &&
      ir.water.material.id === ir.water.components[0]?.id &&
      [
        ir.transition.staticMask,
        ir.transition.bankOverlay,
        ...ir.ground.components,
        ...ir.water.components,
      ].every((ref) => ref.kind === 'source'),
    'IR_SEMANTICS',
    'Surface components must bind the corresponding exact source revisions.',
  );
  requireRule(
    ir.dependencies.length > 0 && ir.dependencies.length <= 64,
    'IR_DEPENDENCIES',
    'Invalid IR dependency count.',
  );
  const keys = new Set<string>();
  ir.dependencies.forEach((ref) => {
    const key = refKey(ref);
    requireRule(!keys.has(key), 'IR_DEPENDENCIES', 'Duplicate IR dependency.');
    keys.add(key);
  });
  for (const ref of [
    ir.recipe,
    ir.parameters,
    ir.ground.material.style,
    ir.transition.staticMask,
    ir.transition.bankOverlay,
    ...ir.ground.components,
    ...ir.water.components,
  ])
    requireRule(
      ir.dependencies.some((d) => sameRef(d, ref)),
      'IR_DEPENDENCIES',
      'IR semantic reference must be bound by an exact dependency.',
    );
  for (const image of [ir.groundImage, ...ir.frames]) {
    requireRule(
      image instanceof RgbaImage && image.width === g.width && image.height === g.height,
      'IR_DIMENSIONS',
      'IR pixels must match the declared geometry.',
    );
    validateDensity(image, ir.density);
    const bytes = image.bytes();
    requireRule(
      bytes.every((v, i) => i % 4 !== 3 || v === 255),
      'IR_ALPHA',
      'Baked fixed shoreline must be opaque.',
    );
  }
  requireRule(
    ir.staticMaskImage instanceof RgbaImage &&
      ir.staticMaskImage.width === g.width &&
      ir.staticMaskImage.height === g.height,
    'IR_MASK',
    'IR must retain its fixed mask geometry.',
  );
  validateDensity(ir.staticMaskImage, ir.density);
  const mask = ir.staticMaskImage.bytes(),
    frames = ir.frames.map((frame) => frame.bytes());
  let staticPixels = 0;
  for (let i = 0; i < mask.length; i += 4) {
    requireRule(
      [0, 255].includes(mask[i]!) &&
        mask[i] === mask[i + 1] &&
        mask[i] === mask[i + 2] &&
        mask[i + 3] === 255,
      'IR_MASK',
      'IR static mask must be opaque binary grayscale.',
    );
    if (mask[i] === 255) {
      staticPixels++;
      requireRule(
        frames.every((frame) => [0, 1, 2, 3].every((c) => frame[i + c] === frames[0]![i + c])),
        'IR_STATIC_GEOMETRY',
        'All animation frames must share identical static bank pixels.',
      );
    }
  }
  requireRule(
    staticPixels > 0 && staticPixels < g.width * g.height && playbackVaries(ir.frames, clip),
    'IR_ANIMATION',
    'IR requires a fixed bank and an actually varying interior.',
  );
  requireRule(
    ir.contentHash === tileIRHash(ir),
    'IR_HASH',
    'Tile IR identity does not match its content.',
  );
}
export function tileIRHash(ir: Omit<TileIR, 'contentHash'>): string {
  return fingerprint({
    contract: ir.contract,
    geometry: ir.geometry,
    density: ir.density,
    ground: ir.ground,
    water: ir.water,
    transition: ir.transition,
    animation: ir.animation,
    groundHash: ir.groundImage.pixelHash,
    staticMaskHash: ir.staticMaskImage.pixelHash,
    frames: ir.frames.map((p) => p.pixelHash),
    dependencies: ir.dependencies,
    recipe: ir.recipe,
    parameters: ir.parameters,
  });
}
export interface CompilableAsset {
  readonly state: 'COMPILABLE_RECIPE';
  readonly ir: TileIR;
}
export function immutableTileIR(input: TileIR): TileIR {
  validateTileIR(input);
  const { groundImage, staticMaskImage, frames, ...metadata } = input;
  return Object.freeze({
    ...freezeJson(metadata),
    groundImage,
    staticMaskImage,
    frames: Object.freeze([...frames]),
  });
}
export interface BuiltAsset {
  readonly state: 'BUILT_ARTIFACT';
  readonly id: string;
  readonly ir: TileIR;
  readonly artifactHash: string;
  readonly targetCompilation: 'NOT_EXECUTED';
}
export function buildProcessedAsset(input: CompilableAsset, id: string): BuiltAsset {
  requireRule(
    input.state === 'COMPILABLE_RECIPE' && /^[a-z][a-z0-9-]{0,63}$/.test(id),
    'BUILD_STATE',
    'A processed build requires a compilable recipe and stable ID.',
  );
  validateTileIR(input.ir);
  const ir = immutableTileIR(input.ir);
  return Object.freeze({
    state: 'BUILT_ARTIFACT',
    id,
    ir,
    artifactHash: ir.contentHash,
    targetCompilation: 'NOT_EXECUTED',
  });
}
/** Append-only metadata catalog; deleting or replacing a revision is deliberately unavailable. */
export class RevisionCatalog {
  #refs = new Map<string, RevisionRef>();
  publish(ref: RevisionRef): void {
    validateRef(ref);
    const key = refKey(ref);
    requireRule(
      !this.#refs.has(key),
      'IMMUTABLE_REVISION',
      'A published revision cannot be replaced.',
    );
    this.#refs.set(key, freezeJson(ref));
  }
  contains(ref: RevisionRef): boolean {
    const existing = this.#refs.get(refKey(ref));
    return !!existing && sameRef(existing, ref);
  }
  latest(ref: RevisionRef): RevisionRef | undefined {
    return [...this.#refs.values()]
      .filter((r) => r.kind === ref.kind && r.id === ref.id)
      .sort((a, b) => b.revision - a.revision)[0];
  }
}
export type ProjectAdoption = readonly RevisionRef[];
export function adoptRevision(
  current: ProjectAdoption,
  next: RevisionRef,
  catalog: RevisionCatalog,
): ProjectAdoption {
  requireRule(
    catalog.contains(next),
    'DEPENDENCY_MISSING',
    'Cannot adopt an unpublished revision.',
  );
  validateAdoptionIdentities(current);
  return freezeJson([...current.filter((r) => r.kind !== next.kind || r.id !== next.id), next]);
}
export function assessBuild(
  build: BuiltAsset,
  catalog: RevisionCatalog,
  current: ProjectAdoption,
): {
  readonly historicalValidity: 'VALID' | 'MISSING_DEPENDENCY';
  readonly newerAvailable: readonly RevisionRef[];
  readonly currentMismatches: readonly RevisionRef[];
  readonly needsRebuild: boolean;
} {
  requireRule(
    build.state === 'BUILT_ARTIFACT' &&
      build.artifactHash === build.ir.contentHash &&
      build.targetCompilation === 'NOT_EXECUTED',
    'BUILD_STATE',
    'Processed artifact identity and state must agree.',
  );
  validateTileIR(build.ir);
  validateAdoptionIdentities(current);
  const newerAvailable = build.ir.dependencies.flatMap((ref) => {
    const latest = catalog.latest(ref);
    return latest && latest.revision > ref.revision ? [latest] : [];
  });
  const currentMismatches = build.ir.dependencies.filter((ref) => {
    const chosen = current.find((r) => r.id === ref.id && r.kind === ref.kind);
    return chosen && !sameRef(chosen, ref);
  });
  return freezeJson({
    historicalValidity: build.ir.dependencies.every((ref) => catalog.contains(ref))
      ? 'VALID'
      : 'MISSING_DEPENDENCY',
    newerAvailable,
    currentMismatches,
    needsRebuild: currentMismatches.length > 0,
  });
}
