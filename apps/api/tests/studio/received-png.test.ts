import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { chunk, pngSample } from '../../../../tests/png-samples.js';
import { assertReceivedPng } from './received-png.js';

const dimensions = { width: 1, height: 1 };
const gamma = Buffer.alloc(4);
gamma.writeUInt32BE(45455);
const chromaticity = Buffer.alloc(32);
[31270, 32900, 64000, 33000, 30000, 60000, 15000, 6000].forEach((v, i) =>
  chromaticity.writeUInt32BE(v, i * 4),
);
const valid = pngSample([
  chunk('sRGB', Buffer.from([0])),
  chunk('gAMA', gamma),
  chunk('cHRM', chromaticity),
  chunk('pHYs', Buffer.alloc(9)),
]);
function checksumOffset(name: string) {
  let at = 8;
  while (at < valid.length) {
    const length = valid.readUInt32BE(at);
    if (valid.toString('ascii', at + 4, at + 8) === name) return at + 8 + length;
    at += length + 12;
  }
  throw Error('Missing independently generated fixture chunk: ' + name);
}

it('validates the public frozen container policy and the actual consumer dimensions', () => {
  expect(() => assertReceivedPng(valid, dimensions)).not.toThrow();
  expect(() =>
    assertReceivedPng(readFileSync('tests/fixtures/art-water-0.png'), { width: 96, height: 144 }),
  ).not.toThrow();
  expect(() => assertReceivedPng(valid, { width: 96, height: 144 })).toThrow('dimensions');
});

it.each(['IHDR', 'sRGB', 'gAMA', 'cHRM', 'pHYs', 'IDAT', 'IEND'])(
  'rejects the actual %s checksum even if a decoder may tolerate it',
  (name) => {
    const bad = Buffer.from(valid),
      at = checksumOffset(name);
    bad[at] = bad[at]! ^ 1;
    expect(() => assertReceivedPng(bad, dimensions)).toThrow('checksum');
  },
);

it.each([
  ['signature', () => Buffer.concat([Buffer.alloc(8), valid.subarray(8)])],
  ['truncated chunk header', () => valid.subarray(0, 36)],
  ['truncated CRC', () => valid.subarray(0, -1)],
  ['missing IEND', () => valid.subarray(0, -12)],
  ['trailing byte', () => Buffer.concat([valid, Buffer.from([0])])],
  [
    'chunk beyond body',
    () => {
      const bad = Buffer.from(valid);
      bad.writeUInt32BE(0xffffffff, 8);
      return bad;
    },
  ],
  [
    'duplicate singleton',
    () => pngSample([chunk('sRGB', Buffer.from([0])), chunk('sRGB', Buffer.from([0]))]),
  ],
  ['APNG', () => pngSample([], true)],
  ['ICC', () => pngSample([chunk('iCCP', Buffer.from('fixture-profile'))])],
  ['non-sRGB gamma', () => pngSample([chunk('gAMA', Buffer.from([0, 0, 0, 1]))])],
  ['encoded budget', () => Buffer.alloc(4 * 1024 * 1024 + 1)],
  [
    'chunk budget',
    () =>
      Buffer.concat([
        valid.subarray(0, -12),
        ...Array.from({ length: 4096 }, () => chunk('IDAT', Buffer.alloc(0))),
        valid.subarray(-12),
      ]),
  ],
] as const)('rejects %s without native decode or a relaxed PNG policy', (_name, make) => {
  expect(() => assertReceivedPng(make(), dimensions)).toThrow();
});
