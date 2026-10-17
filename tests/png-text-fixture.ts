import { crc32 } from 'node:zlib';
/** Independently assembled fixture chunk; production uses its own bitwise CRC implementation. */
export function withTextChunk(png: Uint8Array, type = 'tEXt'): Uint8Array {
  const data = Buffer.from('Software\0step08-fixture'), chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, chunk.length - 4)), chunk.length - 4);
  return new Uint8Array(Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]));
}
