// Bounded, uncompressed ZIP for the unchanged eight-file standard export.
export function zipFiles(files: Readonly<Record<string, Uint8Array>>) {
  const records: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  const crc = (b: Uint8Array) => {
    let c = 0xffffffff;
    for (const v of b) {
      c ^= v;
      for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  for (const name of Object.keys(files).sort()) {
    const bytes = files[name]!,
      n = Buffer.from(name);
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(name)) throw new Error('ZIP member');
    if (offset + bytes.length > 64 * 1024 * 1024) throw new Error('ZIP byte budget');
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt32LE(crc(bytes), 14);
    h.writeUInt32LE(bytes.length, 18);
    h.writeUInt32LE(bytes.length, 22);
    h.writeUInt16LE(n.length, 26);
    records.push(h, n, Buffer.from(bytes));
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt32LE(crc(bytes), 16);
    c.writeUInt32LE(bytes.length, 20);
    c.writeUInt32LE(bytes.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, n);
    offset += h.length + n.length + bytes.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...records, directory, end]);
}
