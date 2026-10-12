import { RgbaImage, fingerprint, freezeJson, requireDenseArray } from '@tileset/asset-core';
import { validateFragment } from '@tileset/mz-compiler';
import type { Category, CompiledFragment } from '@tileset/mz-compiler';

export const PACK_CONTRACT = 'mz-pack-v1';
export const LAYOUT_CONTRACT = 'mz-layout-v1';
export const ASSEMBLY_VERSION = 'stable-slots-v1';
// Identity only: coordinates/rules remain in src/profile.ts, supplied by the caller.
export const PROFILE_HASH = '48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793';
export interface PackProfile {
  readonly id: string;
  readonly version: string;
  readonly atlas: { readonly width: number; readonly height: number };
  readonly groundSlots: readonly {
    readonly kind: number;
    readonly tileId: number;
    readonly x: number;
    readonly y: number;
  }[];
  readonly waterSlots: PackProfile['groundSlots'];
}
export class PackError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PackError';
  }
}
function check(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new PackError(code, message);
}
function boundary<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof PackError) throw e;
    throw new PackError('PACK_INPUT', e instanceof Error ? e.message : 'Invalid Pack data.');
  }
}
function record(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  check(
    typeof value === 'object' &&
      value !== null &&
      Object.getPrototypeOf(value) === Object.prototype,
    'PACK_JSON',
    'Expected a plain record.',
  );
  check(
    Object.keys(value).sort().join(',') === keys.sort().join(','),
    'PACK_FIELDS',
    'Missing or unsupported fields.',
  );
}
function id(value: unknown): asserts value is string {
  check(
    typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value),
    'PACK_ID',
    'Expected a stable logical ID.',
  );
}
function version(value: unknown): asserts value is number {
  check(
    Number.isSafeInteger(value) && (value as number) > 0,
    'PACK_VERSION',
    'Expected a positive safe integer revision/version.',
  );
}
function sha(value: unknown): asserts value is string {
  check(
    typeof value === 'string' && /^[a-f0-9]{64}$/.test(value),
    'PACK_HASH',
    'Expected a SHA-256 identity.',
  );
}
export function validateProfile(value: unknown): PackProfile {
  return boundary(() => {
    check(
      fingerprint(value) === PROFILE_HASH,
      'PACK_PROFILE',
      'Only the unchanged retained Native Profile is supported.',
    );
    return freezeJson(value) as PackProfile;
  });
}
export function describeFragment(input: unknown) {
  validateFragment(input);
  return freezeJson({
    ...input,
    image: {
      width: input.image.width,
      height: input.image.height,
      pixelHash: input.image.pixelHash,
    },
  });
}
export type FragmentRecord = ReturnType<typeof describeFragment>;
export interface Binding {
  readonly logicalId: string;
  readonly revision: number;
  readonly groundId: string | null;
  readonly fragment: FragmentRecord;
}
export interface Slot {
  readonly atlas: 'A1' | 'A2';
  readonly kind: number;
  readonly state: 'NEVER_USED' | 'ACTIVE' | 'RETIRED';
  readonly binding: Binding | null;
}
export interface PackSnapshot {
  readonly contract: typeof PACK_CONTRACT;
  readonly assembly: typeof ASSEMBLY_VERSION;
  readonly packId: string;
  readonly version: number;
  readonly profile: { readonly id: string; readonly version: string; readonly contentHash: string };
  readonly previousHash: string | null;
  readonly slots: readonly Slot[];
  readonly contentHash: string;
}
export interface LayoutPlan {
  readonly contract: typeof LAYOUT_CONTRACT;
  readonly assembly: typeof ASSEMBLY_VERSION;
  readonly snapshotHash: string;
  readonly profileHash: string;
  readonly placements: readonly {
    readonly atlas: 'A1' | 'A2';
    readonly kind: number;
    readonly tileId: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly state: 'ACTIVE' | 'RETIRED';
    readonly binding: Binding;
  }[];
  readonly contentHash: string;
}
export type Operation =
  | {
      readonly operation: 'put';
      readonly logicalId: string;
      readonly revision: number;
      readonly fragmentHash: string;
      readonly groundId: string | null;
    }
  | { readonly operation: 'retire'; readonly logicalId: string };
function inventory(profile: PackProfile) {
  return [
    ...profile.waterSlots.map((s) => ({
      ...s,
      atlas: 'A1' as const,
      category: 'a1-water' as Category,
    })),
    ...profile.groundSlots.map((s) => ({
      ...s,
      atlas: 'A2' as const,
      category: 'a2-ground' as Category,
    })),
  ];
}
function registry(input: unknown): Map<string, CompiledFragment> {
  requireDenseArray(input, 'Fragments');
  check(input.length <= 1024, 'PACK_LIMIT', 'Fragment registry is bounded.');
  const result = new Map<string, CompiledFragment>();
  const revisions = new Map<string, string>();
  for (const f of input) {
    validateFragment(f);
    for (const r of f.source.dependencies) {
      const key = `${r.kind}:${r.id}@${r.revision}`,
        previous = revisions.get(key);
      check(
        !previous || previous === r.contentHash,
        'PACK_REVISION',
        'One exact source/recipe revision cannot have conflicting content across Pack history.',
      );
      revisions.set(key, r.contentHash);
    }
    result.set(f.contentHash, f);
  }
  return result;
}
function pairings(slots: readonly Slot[]): void {
  for (const s of slots) {
    const b = s.binding;
    if (!b || s.atlas !== 'A1') continue;
    const ground = slots.find(
      (g) => g.binding?.logicalId === b.groundId && g.atlas === 'A2',
    )?.binding;
    check(
      ground &&
        ground.fragment.source.irHash === b.fragment.source.irHash &&
        fingerprint(ground.fragment.source.dependencies) ===
          fingerprint(b.fragment.source.dependencies) &&
        fingerprint(ground.fragment.source.recipe) === fingerprint(b.fragment.source.recipe) &&
        fingerprint(ground.fragment.source.parameters) ===
          fingerprint(b.fragment.source.parameters) &&
        ground.fragment.source.density === b.fragment.source.density &&
        ground.fragment.source.components.every((c) =>
          b.fragment.source.dependencies.some((d) => fingerprint(c) === fingerprint(d)),
        ),
      'PACK_PAIRING',
      'Water, including retired compatibility content, must retain its exact ground/IR/recipe dependencies. Rebuild paired components together.',
    );
  }
}
function snapshot(
  profile: PackProfile,
  value: unknown,
  fragments: Map<string, CompiledFragment>,
  previous: PackSnapshot | null,
): PackSnapshot {
  record(value, [
    'contract',
    'assembly',
    'packId',
    'version',
    'profile',
    'previousHash',
    'slots',
    'contentHash',
  ]);
  id(value.packId);
  version(value.version);
  sha(value.contentHash);
  check(
    value.contract === PACK_CONTRACT && value.assembly === ASSEMBLY_VERSION,
    'PACK_CONTRACT',
    'Unsupported Pack contract.',
  );
  check(
    fingerprint(value.profile) ===
      fingerprint({ id: profile.id, version: profile.version, contentHash: PROFILE_HASH }),
    'PACK_PROFILE',
    'Pack Profile identity mismatch.',
  );
  check(
    previous
      ? value.previousHash === previous.contentHash &&
          value.packId === previous.packId &&
          value.version === previous.version + 1
      : value.previousHash === null && value.version === 1,
    'PACK_BASELINE',
    'Complete sequential history is required, with the same Pack ID/Profile.',
  );
  requireDenseArray(value.slots, 'Slots');
  const expected = inventory(profile);
  check(
    value.slots.length === expected.length,
    'PACK_SLOTS',
    'Every supported slot, including NEVER_USED, must be recorded.',
  );
  const logical = new Set<string>();
  for (let i = 0; i < expected.length; i++) {
    const s = value.slots[i];
    const e = expected[i]!;
    record(s, ['atlas', 'kind', 'state', 'binding']);
    check(
      s.atlas === e.atlas && s.kind === e.kind,
      'PACK_SLOTS',
      'Slot order/type/kind must match the Profile.',
    );
    check(
      ['NEVER_USED', 'ACTIVE', 'RETIRED'].includes(s.state as string),
      'PACK_STATE',
      'Invalid lifecycle state.',
    );
    if (s.state === 'NEVER_USED')
      check(s.binding === null, 'PACK_STATE', 'Unused slots cannot hide bindings.');
    else {
      const b = s.binding;
      record(b, ['logicalId', 'revision', 'groundId', 'fragment']);
      id(b.logicalId);
      version(b.revision);
      check(!logical.has(b.logicalId), 'PACK_CONFLICT', 'Logical identity occurs more than once.');
      logical.add(b.logicalId);
      if (e.atlas === 'A1') id(b.groundId);
      else check(b.groundId === null, 'PACK_PAIRING', 'Ground does not reference another ground.');
      check(
        typeof b.fragment === 'object' && b.fragment !== null,
        'PACK_FRAGMENT',
        'Missing Fragment record.',
      );
      const f = fragments.get((b.fragment as FragmentRecord).contentHash);
      check(
        f && fingerprint(b.fragment) === fingerprint(describeFragment(f)),
        'PACK_FRAGMENT',
        'Actual Compiler Fragment and recorded identity/source/layout must agree.',
      );
      check(
        f.category === e.category &&
          f.target.id === profile.id &&
          f.target.version === profile.version &&
          f.placement.allowedKinds.includes(e.kind),
        'PACK_CATEGORY',
        'Fragment is incompatible with the selected slot.',
      );
    }
    const before = previous?.slots[i];
    if (before) {
      if (before.state === 'NEVER_USED')
        check(s.state !== 'RETIRED', 'PACK_TRANSITION', 'An unused slot cannot directly retire.');
      else {
        const after = s.binding as Binding | null;
        check(
          after && after.logicalId === before.binding!.logicalId && s.state !== 'NEVER_USED',
          'PACK_TRANSITION',
          'An existing logical binding cannot be moved, cleared or replaced.',
        );
        if (before.state === 'RETIRED' || s.state === 'RETIRED')
          check(
            fingerprint(after) === fingerprint(before.binding) && s.state === 'RETIRED',
            'PACK_TRANSITION',
            'Retirement preserves the last valid binding permanently.',
          );
        else
          check(
            after.revision > before.binding!.revision ||
              fingerprint(after) === fingerprint(before.binding),
            'PACK_REVISION',
            'Updates must advance revision; the same revision has one immutable meaning.',
          );
      }
    }
  }
  const owned = freezeJson(value) as unknown as PackSnapshot;
  pairings(owned.slots);
  const { contentHash: _hash, ...body } = owned;
  check(
    fingerprint(body) === owned.contentHash,
    'PACK_HASH',
    'Pack identity does not match its actual content.',
  );
  return owned;
}
function history(
  profile: PackProfile,
  input: unknown,
  fragments: Map<string, CompiledFragment>,
): readonly PackSnapshot[] {
  requireDenseArray(input, 'History');
  check(input.length < 256, 'PACK_LIMIT', 'V1 local history is bounded to 256 snapshots.');
  const result: PackSnapshot[] = [];
  for (const value of input)
    result.push(snapshot(profile, value, fragments, result.at(-1) ?? null));
  return Object.freeze(result);
}
export function validatePack(
  profileInput: unknown,
  snapshotInput: unknown,
  historyInput: unknown,
  fragmentsInput: unknown,
): PackSnapshot {
  return boundary(() => {
    const p = validateProfile(profileInput),
      f = registry(fragmentsInput),
      h = history(p, historyInput, f);
    return snapshot(p, snapshotInput, f, h.at(-1) ?? null);
  });
}
export function planPack(
  profileInput: unknown,
  requestInput: unknown,
  historyInput: unknown,
  fragmentsInput: unknown,
) {
  return boundary(() => {
    const p = validateProfile(profileInput),
      fragments = registry(fragmentsInput),
      h = history(p, historyInput, fragments),
      prev = h.at(-1) ?? null;
    record(requestInput, ['packId', 'version', 'operations']);
    id(requestInput.packId);
    version(requestInput.version);
    check(
      prev
        ? requestInput.packId === prev.packId && requestInput.version === prev.version + 1
        : requestInput.version === 1,
      'PACK_BASELINE',
      'Request must advance the supplied Pack baseline.',
    );
    requireDenseArray(requestInput.operations, 'Operations');
    check(
      requestInput.operations.length <= 8,
      'PACK_LIMIT',
      'Too many operations for this Profile.',
    );
    const ids = new Set<string>();
    const operations = requestInput.operations
      .map((op) => {
        check(
          typeof op === 'object' && op !== null,
          'PACK_OPERATION',
          'Expected explicit put/retire operation.',
        );
        const operation = (op as Operation).operation;
        record(
          op,
          operation === 'put'
            ? ['operation', 'logicalId', 'revision', 'fragmentHash', 'groundId']
            : ['operation', 'logicalId'],
        );
        check(
          operation === 'put' || operation === 'retire',
          'PACK_OPERATION',
          'Reuse, purge, deletion and profile migration are unsupported.',
        );
        id(op.logicalId);
        check(
          !ids.has(op.logicalId),
          'PACK_CONFLICT',
          'Conflicting operations for one logical identity.',
        );
        ids.add(op.logicalId);
        if (operation === 'put') {
          version(op.revision);
          sha(op.fragmentHash);
          if (op.groundId !== null) id(op.groundId);
        }
        return op as unknown as Operation;
      })
      .sort((a, b) => (a.logicalId < b.logicalId ? -1 : a.logicalId > b.logicalId ? 1 : 0));
    const slots: Slot[] = (
      prev?.slots ??
      inventory(p).map((s) => ({
        atlas: s.atlas,
        kind: s.kind,
        state: 'NEVER_USED' as const,
        binding: null,
      }))
    ).map((s) => ({ ...s }));
    for (const op of operations) {
      const i = slots.findIndex((s) => s.binding?.logicalId === op.logicalId);
      if (op.operation === 'retire') {
        check(i >= 0, 'PACK_RETIRE', 'Cannot retire an unknown logical material.');
        slots[i] = { ...slots[i]!, state: 'RETIRED' };
        continue;
      }
      const f = fragments.get(op.fragmentHash);
      check(f, 'PACK_FRAGMENT', 'Required Compiler Fragment is missing.');
      check(
        i < 0 || slots[i]!.state === 'ACTIVE',
        'PACK_RETIRED',
        'Retired slots cannot be reactivated or updated.',
      );
      const atlas = f.category === 'a1-water' ? 'A1' : 'A2';
      const index =
        i < 0 ? slots.findIndex((s) => s.atlas === atlas && s.state === 'NEVER_USED') : i;
      check(
        index >= 0,
        'PACK_CAPACITY',
        `No NEVER_USED ${atlas} slot remains; existing/retired slots cannot be reused.`,
      );
      slots[index] = {
        ...slots[index]!,
        state: 'ACTIVE',
        binding: {
          logicalId: op.logicalId,
          revision: op.revision,
          groundId: op.groundId,
          fragment: describeFragment(f),
        },
      };
    }
    const body = {
      contract: PACK_CONTRACT,
      assembly: ASSEMBLY_VERSION,
      packId: requestInput.packId,
      version: requestInput.version,
      profile: { id: p.id, version: p.version, contentHash: PROFILE_HASH },
      previousHash: prev?.contentHash ?? null,
      slots,
    };
    const s = snapshot(p, { ...body, contentHash: fingerprint(body) }, fragments, prev);
    return Object.freeze({ snapshot: s, history: h, plan: layout(p, s, fragments) });
  });
}
function layout(
  profile: PackProfile,
  s: PackSnapshot,
  fragments: Map<string, CompiledFragment>,
): LayoutPlan {
  const placements: LayoutPlan['placements'][number][] = [];
  for (const [i, slot] of s.slots.entries()) {
    if (slot.state === 'NEVER_USED') continue;
    const b = slot.binding!,
      f = fragments.get(b.fragment.contentHash)!,
      location = inventory(profile)[i]!;
    const { width, height, alignment } = f.placement;
    check(
      location.x % alignment.x === 0 &&
        location.y % alignment.y === 0 &&
        location.x >= 0 &&
        location.y >= 0 &&
        location.x + width <= profile.atlas.width &&
        location.y + height <= profile.atlas.height,
      'LAYOUT_BOUNDS',
      'Placement must be aligned and within the target atlas.',
    );
    check(
      !placements.some(
        (o) =>
          o.atlas === slot.atlas &&
          location.x < o.x + o.width &&
          location.x + width > o.x &&
          location.y < o.y + o.height &&
          location.y + height > o.y,
      ),
      'LAYOUT_OVERLAP',
      'Fragment placements cannot overlap.',
    );
    placements.push({ ...location, state: slot.state, binding: b, width, height });
  }
  // category is an inventory helper, not part of the public placement.
  const clean = placements.map(({ atlas, kind, tileId, x, y, width, height, state, binding }) => ({
    atlas,
    kind,
    tileId,
    x,
    y,
    width,
    height,
    state,
    binding,
  }));
  const body: Omit<LayoutPlan, 'contentHash'> = {
    contract: LAYOUT_CONTRACT,
    assembly: ASSEMBLY_VERSION,
    snapshotHash: s.contentHash,
    profileHash: PROFILE_HASH,
    placements: clean,
  };
  return freezeJson({ ...body, contentHash: fingerprint(body) });
}
export function validateLayout(
  profileInput: unknown,
  planInput: unknown,
  snapshotInput: unknown,
  historyInput: unknown,
  fragmentsInput: unknown,
): LayoutPlan {
  return boundary(() => {
    const p = validateProfile(profileInput),
      f = registry(fragmentsInput),
      h = history(p, historyInput, f),
      s = snapshot(p, snapshotInput, f, h.at(-1) ?? null);
    const expected = layout(p, s, f);
    check(
      fingerprint(planInput) === fingerprint(expected),
      'LAYOUT_CONTENT',
      'Layout must exactly implement the validated Pack bindings and Profile.',
    );
    return expected;
  });
}
/** Renderer executes a validated plan; no allocation, scaling or quarter-tile rules. */
export function renderAtlas(
  profileInput: unknown,
  planInput: unknown,
  snapshotInput: unknown,
  historyInput: unknown,
  fragmentsInput: unknown,
) {
  return boundary(() => {
    const p = validateProfile(profileInput),
      plan = validateLayout(p, planInput, snapshotInput, historyInput, fragmentsInput),
      fragments = registry(fragmentsInput);
    const planes = {
      A1: new Uint8Array(p.atlas.width * p.atlas.height * 4),
      A2: new Uint8Array(p.atlas.width * p.atlas.height * 4),
    };
    for (const placement of plan.placements) {
      const pixels = fragments.get(placement.binding.fragment.contentHash)!.image.bytes();
      for (let y = 0; y < placement.height; y++)
        planes[placement.atlas].set(
          pixels.subarray(y * placement.width * 4, (y + 1) * placement.width * 4),
          ((placement.y + y) * p.atlas.width + placement.x) * 4,
        );
    }
    return Object.freeze({
      a1: new RgbaImage({ ...p.atlas, data: planes.A1 }),
      a2: new RgbaImage({ ...p.atlas, data: planes.A2 }),
      planHash: plan.contentHash,
    });
  });
}
