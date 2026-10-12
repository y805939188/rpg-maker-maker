import { describe, expect, it } from 'vitest';
import {
  RawSource,
  RgbaImage,
  animationClip,
  createRevision,
  fingerprint,
  frameAt,
  geometry,
  styleProfile,
  validatedDecodedSource,
} from '../src/index.js';

export const provenance = {
  origin: 'manual' as const,
  author: 'Independent fixture author',
  license: 'CC0-1.0',
  toolVersion: 'hand-authored-v1',
  parents: [],
};
describe('owned source, revision and generic geometry', () => {
  it('owns encoded and decoded byte storage, including views and returned copies', () => {
    const input = Buffer.from([1, 2, 3, 255]);
    const raw = new RawSource({
      id: 'grass',
      revision: 3,
      role: 'grass',
      density: 1,
      encoding: 'rgba8',
      bytes: input,
      provenance,
    });
    const image = new RgbaImage({ width: 1, height: 1, data: input });
    const hash = image.pixelHash;
    input.fill(0);
    raw.bytes().fill(8);
    image.bytes().fill(9);
    image.pixels().data.fill(10);
    expect([...raw.bytes()]).toEqual([1, 2, 3, 255]);
    expect([...image.bytes()]).toEqual([1, 2, 3, 255]);
    expect(image.pixelHash).toBe(hash);
  });
  it('preserves raw versus validated states and refuses inconsistent RGBA evidence', () => {
    const raw = new RawSource({
      id: 'grass',
      revision: 3,
      role: 'grass',
      density: 1,
      encoding: 'rgba8',
      bytes: new Uint8Array([1, 2, 3, 255]),
      provenance,
    });
    expect(raw.state).toBe('RAW_SOURCE');
    expect(validatedDecodedSource(raw, { width: 1, height: 1, data: raw.bytes() }).state).toBe(
      'VALIDATED_SOURCE',
    );
    expect(() =>
      validatedDecodedSource(raw, { width: 1, height: 1, data: new Uint8Array([9, 2, 3, 255]) }),
    ).toThrow('differ');
  });
  it('rejects hidden RGB, malformed buffers, dimensions and oversized planes before allocation', () => {
    for (const p of [
      { width: 1, height: 1, data: new Uint8Array([1, 0, 0, 0]) },
      { width: 1, height: 1, data: new Uint8Array(3) },
      { width: NaN, height: 1, data: new Uint8Array() },
      { width: 769, height: 576, data: new Uint8Array() },
    ])
      expect(() => new RgbaImage(p)).toThrow();
  });
  it('checks density rather than equating final tile size with logical density', () => {
    const bytes = new Uint8Array([1, 2, 3, 255, 1, 2, 3, 255, 1, 2, 3, 255, 1, 2, 3, 255]);
    const raw = new RawSource({
      id: 'grass',
      revision: 1,
      role: 'grass',
      density: 2,
      encoding: 'rgba8',
      bytes,
      provenance,
    });
    expect(validatedDecodedSource(raw, { width: 2, height: 2, data: bytes }).image.width).toBe(2);
    bytes[4] = 8;
    const different = new RawSource({
      id: 'grass',
      revision: 2,
      role: 'grass',
      density: 2,
      encoding: 'rgba8',
      bytes,
      provenance,
    });
    expect(() => validatedDecodedSource(different, { width: 2, height: 2, data: bytes })).toThrow(
      'density',
    );
  });
  it('deep copies and freezes immutable revision metadata, with canonical key ordering', () => {
    const mutable = { nested: { value: 3 }, list: [1, 2] };
    const revision = createRevision('parameters', 'params', 1, mutable);
    mutable.nested.value = 9;
    mutable.list.push(4);
    expect(revision.value).toEqual({ nested: { value: 3 }, list: [1, 2] });
    expect(Object.isFrozen(revision.value.nested)).toBe(true);
    expect(fingerprint({ b: 2, a: 1 })).toBe(fingerprint({ a: 1, b: 2 }));
    for (const invalid of [new Date(), { bad: undefined }, { bad: Infinity }])
      expect(() => fingerprint(invalid)).toThrow();
  });
  it('includes role, density and provenance in source identity while preserving encoded hash', () => {
    const input = {
      id: 'grass',
      revision: 1,
      density: 1,
      encoding: 'rgba8' as const,
      bytes: new Uint8Array([1, 2, 3, 255]),
      provenance,
    };
    const a = new RawSource({ ...input, role: 'grass' }),
      b = new RawSource({ ...input, role: 'water' });
    expect(a.encodedHash).toBe(b.encodedHash);
    expect(a.ref.contentHash).not.toBe(b.ref.contentHash);
  });
  it('requires explicit provenance and bounded valid style palette', () => {
    expect(
      () =>
        new RawSource({
          id: 'grass',
          revision: 0,
          role: 'grass',
          density: 1,
          encoding: 'rgba8',
          bytes: new Uint8Array([1]),
          provenance,
        }),
    ).toThrow();
    expect(() =>
      styleProfile('style', 1, {
        logicalPixelScale: 1,
        palette: [[256, 0, 0]],
        lighting: 'flat',
        outline: 'none',
      }),
    ).toThrow();
  });
  it('requires integer bounded complete nonoverlapping semantic regions', () => {
    const g = {
      width: 4,
      height: 2,
      tileWidth: 2,
      tileHeight: 2,
      regions: [
        { name: 'center', role: 'center' as const, rect: { x: 0, y: 0, width: 4, height: 2 } },
      ],
    };
    expect(geometry(g)).toEqual(g);
    expect(() =>
      geometry({
        ...g,
        regions: [
          ...g.regions,
          { name: 'edge', role: 'edge', rect: { x: 0, y: 0, width: 1, height: 1 } },
        ],
      }),
    ).toThrow('overlap');
    expect(() =>
      geometry({
        ...g,
        regions: [{ ...g.regions[0]!, rect: { x: 0, y: 0, width: 3, height: 2 } }],
      }),
    ).toThrow('cover');
    expect(() =>
      geometry({
        ...g,
        regions: [{ ...g.regions[0]!, rect: { x: 0.5, y: 0, width: 3, height: 2 } }],
      }),
    ).toThrow();
  });
});
describe('generic animation, independent of target frame restrictions', () => {
  it('plays the documented three-source four-state update schedule', () => {
    const clip = animationClip({
      frameCount: 3,
      sequence: [0, 1, 2, 1],
      durations: [30, 30, 30, 30],
      timebase: 'updates',
      loop: true,
    });
    expect([0, 29, 30, 59, 60, 89, 90, 119, 120].map((t) => frameAt(clip, t))).toEqual([
      0, 0, 1, 1, 2, 2, 1, 1, 0,
    ]);
  });
  it('retains arbitrary bounded generic frames, explicit durations and nonlooping clips', () => {
    const sequence = [4, 2, 1];
    const clip = animationClip({
      frameCount: 5,
      sequence,
      durations: [2, 3, 4],
      timebase: 'milliseconds',
      loop: false,
    });
    sequence[0] = 0;
    expect([0, 1, 2, 4, 5, 8, 99].map((t) => frameAt(clip, t))).toEqual([4, 4, 2, 2, 1, 1, 1]);
  });
  it('rejects invalid references, durations and unsafe time', () => {
    const clip = {
      frameCount: 2,
      sequence: [0, 2],
      durations: [1, 1],
      timebase: 'updates' as const,
      loop: true,
    };
    expect(() => animationClip(clip)).toThrow();
    expect(() => animationClip({ ...clip, sequence: [0, 1], durations: [0, 1] })).toThrow();
    expect(() => frameAt({ ...clip, sequence: [0, 1] }, 0.5)).toThrow();
  });
});
