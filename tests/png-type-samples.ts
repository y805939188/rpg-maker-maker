import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';

/** Synthetic malformed type, with a valid independent native CRC over the actual raw bytes. */
export function withPngTypeByte(bytes: Uint8Array, name: string, position: number, value: number) {
  assert.ok(position >= 0 && position < 4 && Number.isInteger(position));
  assert.ok(value >= 0 && value <= 255 && Number.isInteger(value));
  const out = Buffer.from(bytes);
  for (let at = 8; at + 12 <= out.length; ) {
    const length = out.readUInt32BE(at);
    assert.ok(at + 12 + length <= out.length, 'fixture input must already have bounded chunks');
    if (out.subarray(at + 4, at + 8).equals(Buffer.from(name, 'ascii'))) {
      out[at + 4 + position] = value;
      out.writeUInt32BE(crc32(out.subarray(at + 4, at + 8 + length)), at + 8 + length);
      return out;
    }
    at += length + 12;
  }
  throw Error('Fixture chunk was not found: ' + name);
}
