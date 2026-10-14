import { describe, expect, it } from 'vitest';
import { zipFiles } from '../../src/studio-zip.js';
import { readStoredStandardZip } from './stored-zip.js';

// Container tests use the real serializer, not invented local/central records.
// The payloads are explicitly container fixtures, not PNG/artifact quality evidence.
const input = Object.fromEntries(
  [
    'A1.png',
    'A2.png',
    'INSTALL.md',
    'history.json',
    'layout.json',
    'manifest.json',
    'pack.json',
    'sources.json',
  ].map((name) => [name, Buffer.from('container fixture: ' + name)]),
);
const original = zipFiles(input);
const end = original.length - 22;
const central = original.readUInt32LE(end + 16);
const second = central + 46 + original.readUInt16LE(central + 28);
const localSecond = original.readUInt32LE(second + 42);
const firstBody = 30 + original.readUInt16LE(26);

describe('standard stored ZIP consumer directories', () => {
  it('reads all eight actual serializer members and exact bytes', () => {
    expect(readStoredStandardZip(original)).toEqual(input);
  });

  const corruptions: [string, (zip: Buffer) => Buffer | void][] = [
    [
      'central CRC bit',
      (z) => {
        z[central + 16]! ^= 1;
      },
    ],
    [
      'central traversal name',
      (z) => {
        z.write('../bad', central + 46);
      },
    ],
    [
      'central unknown member',
      (z) => {
        z.write('other!', central + 46);
      },
    ],
    [
      'central invalid UTF8 name',
      (z) => {
        z[central + 46] = 255;
      },
    ],
    [
      'central duplicate member',
      (z) => {
        z.write('A1.png', second + 46);
      },
    ],
    [
      'central local-name mismatch',
      (z) => {
        z.write('A2.png', central + 46);
      },
    ],
    [
      'EOCD count nine',
      (z) => {
        z.writeUInt16LE(9, end + 8);
        z.writeUInt16LE(9, end + 10);
      },
    ],
    [
      'EOCD counts disagree',
      (z) => {
        z.writeUInt16LE(7, end + 8);
      },
    ],
    [
      'EOCD disk',
      (z) => {
        z.writeUInt16LE(1, end + 4);
      },
    ],
    [
      'EOCD central disk',
      (z) => {
        z.writeUInt16LE(1, end + 6);
      },
    ],
    [
      'EOCD comment',
      (z) => {
        z.writeUInt16LE(1, end + 20);
      },
    ],
    [
      'wrong central extent',
      (z) => {
        z.writeUInt32LE(1, end + 12);
      },
    ],
    [
      'out-of-bounds central offset',
      (z) => {
        z.writeUInt32LE(0xffffffff, end + 16);
      },
    ],
    [
      'central signature',
      (z) => {
        z[central]! ^= 1;
      },
    ],
    [
      'central ZIP64 version',
      (z) => {
        z.writeUInt16LE(45, central + 6);
      },
    ],
    [
      'central disk reference',
      (z) => {
        z.writeUInt16LE(1, central + 34);
      },
    ],
    [
      'central external attributes',
      (z) => {
        z.writeUInt32LE(0x10, central + 38);
      },
    ],
    [
      'central lengths disagree',
      (z) => {
        z.writeUInt32LE(1, central + 24);
      },
    ],
    [
      'both directories claim out-of-bounds payload',
      (z) => {
        z.writeUInt32LE(0xffffffff, central + 20);
        z.writeUInt32LE(0xffffffff, central + 24);
        z.writeUInt32LE(0xffffffff, 18);
        z.writeUInt32LE(0xffffffff, 22);
      },
    ],
    [
      'central offset into directory',
      (z) => {
        z.writeUInt32LE(central, central + 42);
      },
    ],
    [
      'central offset into payload',
      (z) => {
        z.writeUInt32LE(firstBody, central + 42);
      },
    ],
    [
      'duplicate local offset',
      (z) => {
        z.writeUInt32LE(0, second + 42);
      },
    ],
    [
      'central name bounds',
      (z) => {
        z.writeUInt16LE(65535, central + 28);
      },
    ],
    [
      'central extra',
      (z) => {
        z.writeUInt16LE(1, central + 30);
      },
    ],
    [
      'central comment',
      (z) => {
        z.writeUInt16LE(1, central + 32);
      },
    ],
    [
      'local signature',
      (z) => {
        z[0]! ^= 1;
      },
    ],
    [
      'local version',
      (z) => {
        z.writeUInt16LE(45, 4);
      },
    ],
    [
      'local CRC bit',
      (z) => {
        z[14]! ^= 1;
      },
    ],
    [
      'payload bit',
      (z) => {
        z[firstBody]! ^= 1;
      },
    ],
    [
      'local stored lengths',
      (z) => {
        z.writeUInt32LE(1, 22);
      },
    ],
    [
      'local name length',
      (z) => {
        z.writeUInt16LE(65535, 26);
      },
    ],
    [
      'local different name',
      (z) => {
        z.write('A2.png', 30);
      },
    ],
    [
      'local extra',
      (z) => {
        z.writeUInt16LE(1, 28);
      },
    ],
    [
      'both flags unsupported',
      (z) => {
        z.writeUInt16LE(8, 6);
        z.writeUInt16LE(8, central + 8);
      },
    ],
    [
      'both methods compressed',
      (z) => {
        z.writeUInt16LE(8, 8);
        z.writeUInt16LE(8, central + 10);
      },
    ],
    [
      'local flags disagree',
      (z) => {
        z.writeUInt16LE(1, 6);
      },
    ],
    [
      'local method disagrees',
      (z) => {
        z.writeUInt16LE(8, 8);
      },
    ],
    [
      'local time disagrees',
      (z) => {
        z.writeUInt16LE(1, 10);
      },
    ],
    [
      'central time',
      (z) => {
        z.writeUInt16LE(1, central + 12);
      },
    ],
    ['truncated payload/directory', (z) => z.subarray(0, localSecond + 8)],
    ['truncated EOCD', (z) => z.subarray(0, z.length - 1)],
    ['trailing foreign byte', (z) => Buffer.concat([z, Buffer.from([0])])],
    ['prefixed foreign byte', (z) => Buffer.concat([Buffer.from([0]), z])],
    [
      'local padding despite consistent relocated directory',
      (z) => {
        const gap = Buffer.concat([z.subarray(0, central), Buffer.from([0]), z.subarray(central)]);
        gap.writeUInt32LE(central + 1, gap.length - 6);
        return gap;
      },
    ],
    [
      'extra central record with correct expanded directory size',
      (z) => {
        const duplicate = z.subarray(central, second);
        const expanded = Buffer.concat([z.subarray(0, end), duplicate, z.subarray(end)]);
        expanded.writeUInt32LE(z.readUInt32LE(end + 12) + duplicate.length, expanded.length - 10);
        return expanded;
      },
    ],
  ];
  it.each(corruptions)('rejects %s', (_name, mutate) => {
    const copy = Buffer.from(original);
    const bad = mutate(copy) ?? copy;
    expect(() => readStoredStandardZip(bad)).toThrow(/Standard ZIP:/);
  });

  it('rejects all short buffers with a diagnostic instead of unchecked reads', () => {
    for (let size = 0; size < 22; size++)
      expect(() => readStoredStandardZip(Buffer.alloc(size))).toThrow(/Standard ZIP:/);
  });
});
