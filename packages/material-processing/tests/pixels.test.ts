import { describe, expect, it } from 'vitest';
import { RgbaImage } from '@tileset/asset-core';
import {
  binaryMask,
  copyRect,
  crop,
  protectStaticRegion,
  resizeNearest,
  scaleNearest,
  sourceOver,
} from '../src/index.js';

const image = (pixels: number[][], width = pixels.length) =>
  new RgbaImage({ width, height: pixels.length / width, data: new Uint8Array(pixels.flat()) });
const a = [10, 20, 30, 255],
  b = [40, 50, 60, 128],
  c = [70, 80, 90, 255],
  z = [0, 0, 0, 0];
describe('hand-calculated pixel expectations', () => {
  it('crops integer half-open regions and preserves partial/zero alpha at edges', () => {
    const source = image([a, b, z, c, a, z], 3);
    expect([...crop(source, { x: 1, y: 0, width: 2, height: 2 }).bytes()]).toEqual([
      ...b,
      ...z,
      ...a,
      ...z,
    ]);
    for (const x of [-1, 0.5, NaN, Infinity, 3])
      expect(() => crop(source, { x, y: 0, width: 1, height: 1 })).toThrow();
  });
  it('snapshots overlap for distinct Buffer views sharing physical storage', () => {
    const shared = Buffer.from([...a, ...c, ...a, ...c, ...b, ...a]);
    const source = { width: 2, height: 2, data: shared.subarray(0, 16) },
      target = { width: 2, height: 2, data: shared.subarray(8, 24) };
    copyRect(source, target, { x: 0, y: 0, width: 2, height: 2 }, 0, 0);
    expect([...target.data]).toEqual([...a, ...c, ...a, ...c]);
  });
  it('snapshots horizontal and vertical in-place overlap and rejects invalid destinations', () => {
    const target = image([a, c, b, z], 2).pixels();
    copyRect(target, target, { x: 0, y: 0, width: 2, height: 1 }, 0, 1);
    expect([...target.data]).toEqual([...a, ...c, ...a, ...c]);
    expect(() => copyRect(target, target, { x: 0, y: 0, width: 2, height: 1 }, 0.5, 0)).toThrow();
  });
  it('uses exact integer nearest-neighbor pixels without introducing colors', () => {
    expect([...scaleNearest(image([a, b]), 2).bytes()]).toEqual([
      ...a,
      ...a,
      ...b,
      ...b,
      ...a,
      ...a,
      ...b,
      ...b,
    ]);
    expect(() => scaleNearest(image([a]), 1.5)).toThrow();
    expect(() => scaleNearest(image([a]), 9999)).toThrow();
  });
  it('only downsamples on explicit nearest request with documented floor selection', () => {
    expect([
      ...resizeNearest(image([a, b, c]), {
        width: 2,
        height: 1,
        method: 'nearest-explicit',
      }).bytes(),
    ]).toEqual([...a, ...b]);
    expect(() =>
      resizeNearest(image([a]), { width: 1, height: 1, method: 'bilinear' as 'nearest-explicit' }),
    ).toThrow();
  });
  it('composes in linear sRGB with one final quantization, not gamma-encoded interpolation', () => {
    // IEC sRGB transfer: linear white at alpha128/255 over opaque black -> sRGB188.
    expect([...sourceOver(image([[0, 0, 0, 255]]), image([[255, 255, 255, 128]])).bytes()]).toEqual(
      [188, 188, 188, 255],
    );
    expect([...sourceOver(image([[255, 0, 0, 128]]), image([[0, 0, 0, 128]])).bytes()]).toEqual([
      156, 0, 0, 192,
    ]);
  });
  it('keeps transparent/opaque identities and nonpremultiplied partial alpha', () => {
    expect([...sourceOver(image([z]), image([z])).bytes()]).toEqual(z);
    expect([...sourceOver(image([a]), image([z])).bytes()]).toEqual(a);
    expect([...sourceOver(image([z]), image([b])).bytes()]).toEqual(b);
    expect([...sourceOver(image([a]), image([c])).bytes()]).toEqual(c);
  });
  it('protects static pixels using binary masks and rejects intermediate/transparent masks', () => {
    const mask = image([
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    ]);
    expect([...protectStaticRegion(image([a, a]), image([c, c]), mask).bytes()]).toEqual([
      ...a,
      ...c,
    ]);
    expect([...binaryMask(mask)]).toEqual([1, 0]);
    for (const invalid of [[128, 128, 128, 255], [255, 0, 0, 255], z])
      expect(() => binaryMask(image([invalid]))).toThrow();
  });
});
