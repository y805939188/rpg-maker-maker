import { beforeAll, describe, expect, it } from 'vitest';
import { fingerprint } from '@tileset/asset-core';
import {
  planPack,
  renderAtlas,
  validateLayout,
  validatePack,
  validateProfile,
} from '../src/index.js';
import { PROFILE } from '../../../src/profile.js';
import { makeCompilerFixture } from '../../../scripts/step04-fixture.js';
import { fragmentsFor, pairOperations, variantFixture } from '../../../scripts/step05-fixture.js';
import type { Operation, PackSnapshot } from '../src/index.js';

let a: ReturnType<typeof fragmentsFor>, b: typeof a, a2: typeof a;
let conflicting: typeof a;
beforeAll(async () => {
  const f = await makeCompilerFixture('art');
  a = fragmentsFor(f);
  b = fragmentsFor(await variantFixture(f, 'other', 1, true));
  a2 = fragmentsFor(await variantFixture(f, 'art', 2, true));
  conflicting = fragmentsFor(await variantFixture(f, 'art', 1, true));
}, 30000);
const registry = () => [...a, ...b, ...a2];
const run = (operations: unknown, history: readonly PackSnapshot[] = []) =>
  planPack(
    PROFILE,
    { packId: 'test-pack', version: history.length + 1, operations },
    history,
    registry(),
  );
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function hash<T extends { contentHash: string }>(v: T): T {
  const { contentHash: _h, ...body } = v;
  return { ...v, contentHash: fingerprint(body) };
}

describe('Stable production Pack contract', () => {
  it('rejects two different contents for one exact immutable source revision across history', () => {
    expect(() =>
      planPack(
        PROFILE,
        { packId: 'conflict', version: 1, operations: [] },
        [],
        [...a, ...conflicting],
      ),
    ).toThrow(/conflicting content/);
  });
  it('allocates independently specified coordinates, types and pixels, leaving reserves transparent', () => {
    const built = run([...pairOperations('z', 1, b), ...pairOperations('a', 1, a)].reverse());
    expect(built.snapshot.slots.map((s) => [s.atlas, s.kind, s.binding!.logicalId])).toEqual([
      ['A1', 4, 'a-water'],
      ['A1', 6, 'z-water'],
      ['A2', 16, 'a-ground'],
      ['A2', 17, 'z-ground'],
    ]);
    expect(built.plan.placements.map((p) => [p.kind, p.x, p.y, p.width, p.height])).toEqual([
      [4, 384, 0, 288, 144],
      [6, 384, 144, 288, 144],
      [16, 0, 0, 96, 144],
      [17, 96, 0, 96, 144],
    ]);
    const image = renderAtlas(PROFILE, built.plan, built.snapshot, [], registry());
    expect([image.a1.width, image.a1.height, image.a2.width, image.a2.height]).toEqual([
      768, 576, 768, 576,
    ]);
    for (const [plane, fragment, x, y] of [
      [image.a2, a[0], 0, 0],
      [image.a2, b[0], 96, 0],
      [image.a1, a[1], 384, 0],
      [image.a1, b[1], 384, 144],
    ] as const) {
      const data = plane.bytes(),
        expected = fragment.image.bytes();
      for (let row = 0; row < 144; row++)
        expect(
          data.slice(((y + row) * 768 + x) * 4, ((y + row) * 768 + x + fragment.image.width) * 4),
        ).toEqual(
          expected.slice(row * fragment.image.width * 4, (row + 1) * fragment.image.width * 4),
        );
    }
    expect(
      image.a1
        .bytes()
        .slice(0, 384 * 4)
        .every((v) => v === 0),
    ).toBe(true);
    expect(
      image.a2
        .bytes()
        .slice(144 * 768 * 4)
        .every((v) => v === 0),
    ).toBe(true);
    expect(a[0].image.bytes()).not.toEqual(b[0].image.bytes());
  });
  it('adds B, keeps omitted A and its pixels, updates A in place, and freezes retirement across JSON reload', () => {
    const v1 = run(pairOperations('a', 1, a)),
      saved = copy(v1.snapshot);
    const v2 = run(pairOperations('b', 1, b), [saved]);
    expect(v2.snapshot.slots[2]).toEqual(v1.snapshot.slots[2]);
    expect(v2.snapshot.slots[0]).toEqual(v1.snapshot.slots[0]);
    const first = renderAtlas(PROFILE, v1.plan, saved, [], registry()),
      second = renderAtlas(PROFILE, v2.plan, v2.snapshot, [saved], registry());
    for (let y = 0; y < 144; y++)
      expect(second.a2.bytes().slice(y * 768 * 4, (y * 768 + 96) * 4)).toEqual(
        first.a2.bytes().slice(y * 768 * 4, (y * 768 + 96) * 4),
      );
    const v3 = run(pairOperations('a', 2, a2), [saved, v2.snapshot]);
    expect(v3.snapshot.slots[2]!.kind).toBe(16);
    expect(v3.snapshot.slots[2]!.binding!.fragment.contentHash).toBe(a2[0].contentHash);
    const v4 = run(
      [
        { operation: 'retire', logicalId: 'a-ground' },
        { operation: 'retire', logicalId: 'a-water' },
      ],
      [saved, v2.snapshot, v3.snapshot],
    );
    expect(v4.snapshot.slots[2]!.state).toBe('RETIRED');
    expect(v4.snapshot.slots[2]!.binding).toEqual(v3.snapshot.slots[2]!.binding);
    const retired = renderAtlas(PROFILE, v4.plan, copy(v4.snapshot), copy(v4.history), registry());
    expect(retired.a1.pixelHash).toBe(
      renderAtlas(PROFILE, v3.plan, v3.snapshot, v3.history, registry()).a1.pixelHash,
    );
    expect(() => run(pairOperations('c', 1, a), [...v4.history, copy(v4.snapshot)])).toThrow(
      /NEVER_USED/,
    );
    expect(() => run(pairOperations('a', 3, a), [...v4.history, copy(v4.snapshot)])).toThrow(
      /Retired/,
    );
    expect(saved).toEqual(v1.snapshot);
  });
  it('makes normalized request order deterministic and empty changes preserve all existing bindings', () => {
    const ops = [...pairOperations('b', 1, b), ...pairOperations('a', 1, a)];
    expect(run(ops)).toEqual(run([...ops].reverse()));
    const one = run(ops),
      two = run([], [one.snapshot]);
    expect(two.snapshot.slots).toEqual(one.snapshot.slots);
    expect(two.snapshot.contentHash).not.toBe(one.snapshot.contentHash);
  });
  it('rejects conflict revisions, capacity, missing fragments and implicit destructive operations atomically', () => {
    const one = run(pairOperations('a', 1, a));
    for (const ops of [
      [...pairOperations('a', 1, a), ...pairOperations('a', 2, a2)],
      [...pairOperations('b', 1, b), ...pairOperations('c', 1, b)],
      [{ operation: 'clear', logicalId: 'a-ground' }],
      [{ operation: 'retire', logicalId: 'unknown' }],
      [{ ...pairOperations('b', 1, b)[0], fragmentHash: '0'.repeat(64) }],
    ])
      expect(() => run(ops, [one.snapshot])).toThrow();
    expect(() => run(pairOperations('a', 1, a2), [one.snapshot])).toThrow();
    expect(one.snapshot.slots[2]!.binding!.revision).toBe(1);
  });
  it('rejects mismatched fixed bank dependencies and retains historical validity', () => {
    const first = run(pairOperations('a', 1, a));
    expect(() => run([pairOperations('a', 2, a2)[0]], [first.snapshot])).toThrow(/exact ground/);
    expect(() => run([{ ...pairOperations('a', 1, a)[1], groundId: 'missing' }])).toThrow();
    expect(() => validatePack(PROFILE, first.snapshot, [], registry())).not.toThrow();
    const retired = run([{ operation: 'retire', logicalId: 'a-water' }], [first.snapshot]);
    expect(() => run([pairOperations('a', 2, a2)[0]], [first.snapshot, retired.snapshot])).toThrow(
      /exact ground/,
    );
  });
  it('rejects modified/rehashed layouts and histories; no cloned Fragment can counterfeit compilation', () => {
    const built = run(pairOperations('a', 1, a));
    const rootRetired = copy(built.snapshot);
    for (const slot of rootRetired.slots)
      if (slot.state === 'ACTIVE') Object.assign(slot, { state: 'RETIRED' });
    expect(() => validatePack(PROFILE, hash(rootRetired), [], registry())).toThrow(
      /earlier ACTIVE/,
    );
    for (const change of [
      { x: -96 },
      { x: 768 },
      { width: 96 },
      { kind: 6 },
      { state: 'NEVER_USED' },
      { atlas: 'A2' },
      { x: 480 },
    ]) {
      const p = copy(built.plan);
      Object.assign(p.placements[0]!, change);
      expect(() => validateLayout(PROFILE, hash(p), built.snapshot, [], registry())).toThrow();
    }
    const p = copy(built.plan);
    (p.placements as unknown[]).push(p.placements[0]);
    expect(() => validateLayout(PROFILE, hash(p), built.snapshot, [], registry())).toThrow();
    const v2 = run(pairOperations('b', 1, b), [built.snapshot]);
    const moved = copy(v2.snapshot);
    (moved.slots[2] as unknown as { binding: unknown }).binding = v2.snapshot.slots[3]!.binding;
    expect(() => validatePack(PROFILE, hash(moved), [built.snapshot], registry())).toThrow();
    expect(() =>
      planPack(PROFILE, { packId: 'test-pack', version: 1, operations: [] }, [], [{ ...a[0] }]),
    ).toThrow();
    expect(() => validatePack(PROFILE, v2.snapshot, [], registry())).toThrow(/history/);
  });
  it.each([null, true, '1', 0, 1.5, [], {}])('rejects public JS scalar revision %j', (value) => {
    const op = { ...pairOperations('a', 1, a)[0], revision: value };
    expect(() => run([op])).toThrow();
  });
  it('hard checks plain JSON, holes, hash types and Profile identity', () => {
    for (const ops of [
      new Array(1),
      [
        {
          operation: 'put',
          logicalId: true,
          revision: 1,
          fragmentHash: a[0].contentHash,
          groundId: null,
        },
      ],
      [{ ...pairOperations('a', 1, a)[0], fragmentHash: 123 }],
    ])
      expect(() => run(ops)).toThrow();
    expect(() =>
      planPack(PROFILE, { packId: 'p', version: 1, operations: [] }, new Array(1), registry()),
    ).toThrow();
    const changed = {
      ...PROFILE,
      waterSlots: [{ ...PROFILE.waterSlots[0], x: 0 }, PROFILE.waterSlots[1]],
    };
    expect(() => validateProfile(changed)).toThrow();
    expect(() => validateProfile({ ...PROFILE, version: 'other' })).toThrow();
    const wrong = run(pairOperations('a', 1, a));
    const tampered = copy(wrong.snapshot);
    (tampered.slots[2]!.binding as unknown as { fragment: unknown }).fragment =
      wrong.snapshot.slots[0]!.binding!.fragment;
    expect(() => validatePack(PROFILE, hash(tampered), [], registry())).toThrow();
  });
  it('owns snapshot/plan/atlas independently of caller objects, arrays, Buffers and returned views', () => {
    const ops = pairOperations('a', 1, a) as Operation[],
      built = run(ops),
      saved = copy(built),
      pixels = renderAtlas(PROFILE, built.plan, built.snapshot, [], registry());
    ops.splice(0);
    const b = Buffer.from(pixels.a1.bytes());
    b.fill(0);
    pixels.a1.bytes().fill(0);
    a[0].image.bytes().fill(0);
    expect(built).toEqual(saved);
    expect(pixels.a1.pixelHash).toBe(
      renderAtlas(PROFILE, built.plan, built.snapshot, [], registry()).a1.pixelHash,
    );
    expect(Object.isFrozen(built.snapshot.slots[2]!.binding!.fragment.source.components)).toBe(
      true,
    );
  });
});
