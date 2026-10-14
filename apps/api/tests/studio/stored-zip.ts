import assert from 'node:assert/strict';

const members = new Set([
  'A1.png',
  'A2.png',
  'INSTALL.md',
  'history.json',
  'layout.json',
  'manifest.json',
  'pack.json',
  'sources.json',
]);

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

// Consumer-side verification of the existing standard exporter format only:
// eight stored ASCII members, no descriptors/extras/comments/ZIP64/multi-disk.
export function readStoredStandardZip(zip: Buffer): Record<string, Buffer> {
  const require = (condition: unknown, detail: string) =>
    assert.ok(condition, 'Standard ZIP: ' + detail);
  const range = (offset: number, size: number, limit: number) => {
    require(Number.isSafeInteger(offset) &&
      offset >= 0 &&
      size >= 0 &&
      offset + size <= limit, 'record bounds');
  };
  const end = zip.length - 22;
  range(end, 22, zip.length);
  require(zip.readUInt32LE(end) === 0x06054b50, 'exact EOCD / no trailing bytes');
  require(zip.readUInt16LE(end + 4) === 0 && zip.readUInt16LE(end + 6) === 0, 'EOCD disk');
  require(zip.readUInt16LE(end + 8) === members.size &&
    zip.readUInt16LE(end + 10) === members.size, 'EOCD member counts');
  require(zip.readUInt16LE(end + 20) === 0, 'EOCD comment');
  const directory = zip.readUInt32LE(end + 16),
    directorySize = zip.readUInt32LE(end + 12);
  range(directory, directorySize, end);
  require(directory + directorySize === end, 'central directory extent');
  const files: Record<string, Buffer> = {},
    spans: { start: number; end: number }[] = [];
  let at = directory;
  for (let index = 0; index < members.size; index++) {
    range(at, 46, end);
    require(zip.readUInt32LE(at) === 0x02014b50, 'central signature');
    require(zip.readUInt16LE(at + 4) === 20 && zip.readUInt16LE(at + 6) === 20, 'version');
    require(zip.readUInt16LE(at + 8) === 0 &&
      zip.readUInt16LE(at + 10) === 0, 'central flags/method');
    require(zip.readUInt32LE(at + 12) === 0, 'central time/date');
    const checksum = zip.readUInt32LE(at + 16),
      length = zip.readUInt32LE(at + 20),
      nameLength = zip.readUInt16LE(at + 28),
      local = zip.readUInt32LE(at + 42);
    require(zip.readUInt32LE(at + 24) === length, 'central stored lengths');
    require(zip.readUInt16LE(at + 30) === 0 &&
      zip.readUInt16LE(at + 32) === 0, 'central extra/comment');
    require(zip.readUInt16LE(at + 34) === 0 &&
      zip.readUInt16LE(at + 36) === 0 &&
      zip.readUInt32LE(at + 38) === 0, 'central disk/attributes');
    range(at + 46, nameLength, end);
    const nameBytes = zip.subarray(at + 46, at + 46 + nameLength),
      name = nameBytes.toString('utf8');
    require(members.has(name) && Buffer.from(name).equals(nameBytes), 'safe exact member name');
    require(!Object.hasOwn(files, name), 'unique central member');
    range(local, 30, directory);
    require(zip.readUInt32LE(local) === 0x04034b50, 'local offset/signature');
    require(zip.readUInt16LE(local + 4) === 20, 'local version');
    require(zip.readUInt16LE(local + 6) === 0 &&
      zip.readUInt16LE(local + 8) === 0, 'local flags/method');
    require(zip.readUInt32LE(local + 10) === 0, 'local time/date');
    require(zip.readUInt32LE(local + 14) === checksum, 'local/central CRC');
    require(zip.readUInt32LE(local + 18) === length &&
      zip.readUInt32LE(local + 22) === length, 'local/central lengths');
    require(zip.readUInt16LE(local + 26) === nameLength, 'local/central name length');
    require(zip.readUInt16LE(local + 28) === 0, 'local extra');
    range(local + 30, nameLength, directory);
    require(zip
      .subarray(local + 30, local + 30 + nameLength)
      .equals(nameBytes), 'local/central name');
    const start = local + 30 + nameLength;
    range(start, length, directory);
    const bytes = zip.subarray(start, start + length);
    require(crc32(bytes) === checksum, 'payload CRC');
    files[name] = bytes;
    spans.push({ start: local, end: start + length });
    at += 46 + nameLength;
  }
  require(at === end, 'central record count/extent');
  spans.sort((a, b) => a.start - b.start);
  let next = 0;
  for (const span of spans) {
    require(span.start === next, 'local gaps/overlap/duplicate offset');
    next = span.end;
  }
  require(next === directory, 'local data extent');
  return files;
}
