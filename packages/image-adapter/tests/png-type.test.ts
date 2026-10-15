import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { RawSource } from '@tileset/asset-core';
import { decodeSource, inspectPng } from '../src/index.js';
import { chunk, pngSample } from '../../../tests/png-samples.js';
import { withPngTypeByte } from '../../../tests/png-type-samples.js';
import { provenance } from '../../material-processing/tests/fixture.js';

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
const names = ['IHDR', 'IDAT', 'IEND', 'sRGB', 'gAMA', 'cHRM', 'pHYs'];

it.each(names.flatMap((name) => [0, 1, 2, 3].map((position) => ({ name, position }))))(
  'rejects non-ASCII raw $name byte $position despite a matching raw-byte CRC',
  ({ name, position }) => {
    const bad = withPngTypeByte(valid, name, position, name.charCodeAt(position) | 0x80);
    expect(() => inspectPng(bad)).toThrow('Invalid or truncated PNG chunk');
  },
);
it('accepts the original legal uppercase/lowercase names and legal metadata', () => {
  expect(inspectPng(valid)).toEqual({ width: 1, height: 1 });
});
it.each(['IHDR', 'IEND', 'sRGB'])(
  'still rejects the reserved bit in ASCII %s with a valid recalculated CRC',
  (name) => {
    expect(() => inspectPng(withPngTypeByte(valid, name, 2, name.charCodeAt(2) | 0x20))).toThrow(
      'Invalid or truncated PNG chunk',
    );
  },
);
it.each([0, 1, 2, 3])(
  'public decode rejects high-bit IEND position%i before native decoding',
  async (position) => {
    const png = readFileSync('tests/fixtures/art-water-0.png');
    const bad = withPngTypeByte(png, 'IEND', position, 'IEND'.charCodeAt(position) | 0x80);
    const result = await decodeSource(
      new RawSource({
        id: 'bad-type',
        revision: 1,
        role: 'water',
        density: 1,
        encoding: 'png',
        bytes: bad,
        provenance,
      }),
    );
    expect(result).toMatchObject({ status: 'rejected', diagnostic: { code: 'PNG_STRUCTURE' } });
  },
);
