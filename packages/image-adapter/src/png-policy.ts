import { AssetError, MAX_ENCODED_BYTES, MAX_PIXELS, requireRule } from '@tileset/asset-core';

export const PNG_POLICY = Object.freeze({
  encodedBytes: MAX_ENCODED_BYTES,
  pixels: MAX_PIXELS,
  ancillaryBytes: 64 * 1024,
  chunks: 4096,
  decodeDeadlineMs: 5000,
  readDeadlineMs: 5000,
  concurrency: 1,
  childJsHeapMiB: 128,
});
export class RepairRequired extends AssetError {}
function crc(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let i = 0; i < 8; i++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
/** Container validation happens before any native codec or metadata parser. */
export function inspectPng(bytes: Uint8Array): { width: number; height: number } {
  return inspect(bytes, false);
}
/** Only the explicit AI RGB conversion uses this; ordinary ingress remains RGBA8-only. */
export function inspectConvertiblePng(bytes: Uint8Array): { width: number; height: number } {
  return inspect(bytes, true);
}
function inspect(
  bytes: Uint8Array,
  allowOpaqueRgb: boolean,
  allowTextRepair = false,
): { width: number; height: number } {
  requireRule(
    bytes.length <= PNG_POLICY.encodedBytes,
    'ENCODED_LIMIT',
    'PNG encoded byte budget exceeded.',
  );
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  requireRule(
    b.length >= 33 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'PNG_SIGNATURE',
    'Expected a PNG file; extensions and MIME are not sufficient.',
  );
  let offset = 8,
    width = 0,
    height = 0,
    count = 0,
    metadata = 0,
    idat = false,
    endedIdat = false,
    ended = false;
  const seen = new Set<string>();
  const allowed = ['IHDR', 'IDAT', 'IEND', 'gAMA', 'sRGB', 'cHRM', 'pHYs'];
  while (offset < b.length) {
    requireRule(
      ++count <= PNG_POLICY.chunks && offset + 12 <= b.length,
      'PNG_STRUCTURE',
      'PNG chunk budget or structure is invalid.',
    );
    const length = b.readUInt32BE(offset),
      typeBytes = b.subarray(offset + 4, offset + 8),
      end = offset + 12 + length;
    requireRule(
      typeBytes.every((byte) => (byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122)) &&
        (b[offset + 6]! & 32) === 0 &&
        end <= b.length,
      'PNG_STRUCTURE',
      'Invalid or truncated PNG chunk.',
    );
    const type = typeBytes.toString('ascii');
    requireRule(
      crc(b.subarray(offset + 4, offset + 8 + length)) === b.readUInt32BE(offset + 8 + length),
      'PNG_CRC',
      'PNG chunk checksum is invalid.',
    );
    const data = b.subarray(offset + 8, offset + 8 + length);
    requireRule(count !== 1 || type === 'IHDR', 'PNG_STRUCTURE', 'PNG header must be first.');
    if (type !== 'IDAT') {
      requireRule(!seen.has(type), 'PNG_STRUCTURE', 'Duplicate singleton PNG chunk.');
      seen.add(type);
      metadata += length;
      requireRule(
        metadata <= PNG_POLICY.ancillaryBytes,
        'METADATA_LIMIT',
        'PNG metadata budget exceeded.',
      );
      if (idat) endedIdat = true;
    }
    if (['iCCP', 'cICP', 'mDCV', 'cLLI'].includes(type))
      throw new AssetError(
        'COLOR_POLICY',
        'ICC/HDR metadata requires an explicit unsupported color conversion.',
      );
    if (['acTL', 'fcTL', 'fdAT'].includes(type))
      throw new AssetError('ANIMATED_PNG', 'PNG must contain exactly one image.');
    if (!allowed.includes(type) && !(allowTextRepair && type === 'tEXt')) {
      if (type[0] === type[0]!.toUpperCase())
        throw new AssetError('PNG_CRITICAL_CHUNK', 'Unknown critical PNG chunk.');
      throw new RepairRequired(
        'METADATA_REPAIR',
        'Remove unsupported metadata in an explicit new source revision; no orientation, density or color conversion was performed.',
      );
    }
    if (type === 'IHDR') {
      requireRule(length === 13 && count === 1, 'PNG_STRUCTURE', 'Invalid PNG header.');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      requireRule(
        width > 0 && height > 0 && width * height <= PNG_POLICY.pixels,
        'PIXEL_LIMIT',
        'Decoded pixel budget exceeded before allocation.',
      );
      if (data[8] !== 8 || (data[9] !== 6 && !(allowOpaqueRgb && data[9] === 2)))
        throw new RepairRequired(
          'RGBA8_REQUIRED',
          'Source requires explicit conversion to nonpalette RGBA8.',
        );
      requireRule(
        data[10] === 0 && data[11] === 0 && [0, 1].includes(data[12]!),
        'PNG_STRUCTURE',
        'Unsupported PNG compression/filter/interlace.',
      );
    }
    if (type === 'IDAT') {
      requireRule(!endedIdat, 'PNG_STRUCTURE', 'PNG image data must be contiguous.');
      idat = true;
    }
    if (['sRGB', 'gAMA', 'cHRM', 'pHYs'].includes(type))
      requireRule(
        !idat,
        'PNG_STRUCTURE',
        'Color and physical-density metadata must precede image data.',
      );
    // pHYs is bounded physical display metadata; logical density is always explicit on RawSource.
    if (type === 'pHYs')
      requireRule(
        length === 9 && [0, 1].includes(data[8]!),
        'PNG_STRUCTURE',
        'Invalid physical-density metadata.',
      );
    if (type === 'sRGB')
      requireRule(length === 1 && data[0]! <= 3, 'COLOR_POLICY', 'Invalid sRGB intent.');
    if (type === 'gAMA')
      requireRule(
        length === 4 && data.readUInt32BE(0) === 45455,
        'COLOR_POLICY',
        'Only the frozen sRGB gamma is accepted.',
      );
    if (type === 'cHRM')
      requireRule(
        length === 32 &&
          [31270, 32900, 64000, 33000, 30000, 60000, 15000, 6000].every(
            (v, i) => data.readUInt32BE(i * 4) === v,
          ),
        'COLOR_POLICY',
        'Only standard sRGB chromaticities are accepted.',
      );
    if (type === 'IEND') {
      requireRule(
        length === 0 && idat && end === b.length,
        'PNG_STRUCTURE',
        'Invalid PNG end or trailing data.',
      );
      ended = true;
    }
    offset = end;
  }
  requireRule(ended, 'PNG_STRUCTURE', 'Missing PNG end.');
  return { width, height };
}

/** Explicit repair only: validate every original CRC/budget, then remove bounded uncompressed text. */
export function stripPngTextMetadata(input: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(input);
  inspect(bytes, true, true);
  const buffer = Buffer.from(bytes.buffer),
    parts = [buffer.subarray(0, 8)];
  for (let offset = 8; offset < buffer.length;) {
    const end = offset + 12 + buffer.readUInt32BE(offset);
    if (buffer.toString('ascii', offset + 4, offset + 8) !== 'tEXt')
      parts.push(buffer.subarray(offset, end));
    offset = end;
  }
  const repaired = new Uint8Array(Buffer.concat(parts));
  inspectConvertiblePng(repaired);
  return repaired;
}
