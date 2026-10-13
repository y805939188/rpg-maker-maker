import { it, expect } from 'vitest';
import { RgbaImage } from '@tileset/asset-core';
import { visualRisks } from '../src/studio-qa.js';
import { connectedShape } from '@tileset/mz-compiler';
import { zipFiles } from '../src/studio-zip.js';
it('independent adjacency cases use the retained MZ shape IDs', () => {
  const empty = {
    north: false,
    south: false,
    west: false,
    east: false,
    nw: false,
    ne: false,
    sw: false,
    se: false,
  };
  expect(connectedShape(empty)).toBe(46);
  expect(
    connectedShape({
      ...empty,
      north: true,
      south: true,
      west: true,
      east: true,
      nw: true,
      ne: true,
      sw: true,
      se: true,
    }),
  ).toBe(0);
  expect(connectedShape({ ...empty, south: true, east: true, se: true })).toBe(34); // NW corner of rectangle
  expect(connectedShape({ ...empty, north: true, west: true, nw: true })).toBe(38); // SE corner
  expect(connectedShape({ ...empty, north: true, south: true, west: true, east: true })).toBe(15); // hole at all diagonals
});
it('QA detects near-static frames, large flicker, and low-color repetition separately', () => {
  const plane = (color: number) =>
    new RgbaImage({
      width: 2,
      height: 2,
      data: new Uint8Array(Array.from({ length: 4 }, () => [color, color, color, 255]).flat()),
    });
  const risks = visualRisks([plane(10), plane(10), plane(240)]);
  expect(risks.map((r) => r.code)).toEqual(
    expect.arrayContaining(['REPETITION', 'LOW_ANIMATION', 'FLICKER', 'COLOR_SHIFT']),
  );
});
it('ZIP directory and stored members contain actual bytes with stable names', () => {
  const zip = zipFiles({
    'A1.png': new Uint8Array([1, 2, 3]),
    'manifest.json': new TextEncoder().encode('{}'),
  });
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  expect(zip.readUInt16LE(zip.length - 14)).toBe(2);
  expect(zip.includes(Buffer.from('manifest.json'))).toBe(true);
});

it('near-equal luminance hue changes still produce a color-shift risk', () => {
  const red = new RgbaImage({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) }),
    green = new RgbaImage({ width: 1, height: 1, data: new Uint8Array([0, 76, 0, 255]) });
  expect(visualRisks([red, green]).some((r) => r.code === 'COLOR_SHIFT')).toBe(true);
});
