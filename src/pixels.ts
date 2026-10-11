import sharp from 'sharp';

export interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

function positiveInteger(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Expected positive integer');
}

export function validatePixels(pixels: Pixels): void {
  positiveInteger(pixels.width);
  positiveInteger(pixels.height);
  if (pixels.width * pixels.height > 768 * 576) throw new Error('Prototype pixel limit exceeded');
  if (pixels.data.length !== pixels.width * pixels.height * 4) throw new Error('Invalid RGBA buffer');
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (pixels.data[i + 3] === 0 && (pixels.data[i] || pixels.data[i + 1] || pixels.data[i + 2])) {
      throw new Error('Transparent pixels must have zero RGB');
    }
  }
}

export function blank(width: number, height: number): Pixels {
  positiveInteger(width);
  positiveInteger(height);
  if (width * height > 768 * 576) throw new Error('Prototype pixel limit exceeded');
  return { width, height, data: new Uint8Array(width * height * 4) };
}

export async function decodePng(bytes: Uint8Array): Promise<Pixels> {
  if (bytes.length > 4 * 1024 * 1024) throw new Error('Prototype PNG byte limit exceeded');
  checkPngContract(bytes);
  const input = sharp(bytes, { limitInputPixels: 768 * 576, failOn: 'warning' });
  const m = await input.metadata();
  // No implicit conversion. Indexed/RGB/gray/16-bit/ICC/animated inputs are deferred to step 03.
  if (m.format !== 'png' || m.depth !== 'uchar' || m.channels !== 4 || !m.hasAlpha ||
      m.space !== 'srgb' || m.icc || (m.pages ?? 1) !== 1) {
    throw new Error('Expected single RGBA8 sRGB PNG without ICC');
  }
  const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
  const pixels = { width: info.width, height: info.height, data: new Uint8Array(data) };
  validatePixels(pixels);
  return pixels;
}

/** Inspect PNG container: libvips metadata describes decoded pixels, not original PNG encoding. */
function checkPngContract(bytes: Uint8Array): void {
  const b = Buffer.from(bytes);
  if (b.length < 33 || !b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    throw new Error('Expected RGBA8 PNG signature');
  }
  let offset = 8, headerSeen = false, endSeen = false;
  const chromaticities = [31270,32900,64000,33000,30000,60000,15000,6000];
  while (offset < b.length) {
    if (offset + 12 > b.length) throw new Error('Truncated PNG chunk');
    const length = b.readUInt32BE(offset);
    const type = b.toString('ascii',offset+4,offset+8);
    if (offset + length + 12 > b.length) throw new Error('Truncated PNG chunk data');
    const data = b.subarray(offset+8,offset+8+length);
    // libvips can ignore bad IDAT/IEND checksums; enforce container integrity ourselves.
    let crc = 0xffffffff;
    for (const value of b.subarray(offset+4,offset+8+length)) {
      crc ^= value;
      for (let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
    }
    if (((crc^0xffffffff)>>>0) !== b.readUInt32BE(offset+8+length)) throw new Error(`PNG ${type} CRC mismatch`);
    if (!headerSeen && type !== 'IHDR') throw new Error('PNG IHDR must be first');
    if (type === 'IHDR') {
      if (headerSeen || length !== 13 || data[8] !== 8 || data[9] !== 6) {
        throw new Error('Expected RGBA8 PNG IHDR (color type 6, depth 8)');
      }
      headerSeen = true;
    }
    if (['acTL','fcTL','fdAT'].includes(type)) throw new Error('Animated PNG is unsupported: single RGBA8 frame required');
    if (['cICP','mDCV','cLLI'].includes(type)) throw new Error('Unsupported PNG HDR/color metadata; sRGB contract required');
    if (type === 'iCCP') throw new Error('Expected PNG without ICC');
    if (type === 'gAMA' && (length !== 4 || data.readUInt32BE(0) !== 45455)) {
      throw new Error('PNG gamma differs from supported sRGB encoding');
    }
    if (type === 'cHRM' && (length !== 32 || chromaticities.some((v,i)=>data.readUInt32BE(i*4)!==v))) {
      throw new Error('PNG chromaticities differ from sRGB');
    }
    if (type === 'sRGB' && (length !== 1 || data[0]! > 3)) throw new Error('Invalid PNG sRGB intent');
    offset += length + 12;
    if (type === 'IEND') {
      if (length !== 0 || offset !== b.length) throw new Error('Invalid PNG end/trailing data');
      endSeen = true;
    }
  }
  if (!endSeen) throw new Error('PNG IEND missing');
}

export async function encodePng(pixels: Pixels): Promise<Buffer> {
  validatePixels(pixels);
  return sharp(pixels.data, { raw: { width: pixels.width, height: pixels.height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}

export function copyRect(source: Pixels, target: Pixels, sx: number, sy: number,
  width: number, height: number, dx: number, dy: number): void {
  validatePixels(source);
  validatePixels(target);
  positiveInteger(width);
  positiveInteger(height);
  for (const v of [sx, sy, dx, dy]) {
    if (!Number.isSafeInteger(v) || v < 0) throw new Error('Crop coordinates must be non-negative integers');
  }
  if (sx + width > source.width || sy + height > source.height ||
      dx + width > target.width || dy + height > target.height) throw new Error('Crop out of bounds');
  // Snapshot makes overlap deterministic even when source and target share storage.
  // Buffer.slice() aliases storage. Construct owned bytes for every row before any write.
  const rows = Array.from({ length: height }, (_, y) => new Uint8Array(source.data.subarray(
    ((sy + y) * source.width + sx) * 4, ((sy + y) * source.width + sx + width) * 4)));
  rows.forEach((row, y) => target.data.set(row, ((dy + y) * target.width + dx) * 4));
}

export function scaleNearest(source: Pixels, factor: number): Pixels {
  validatePixels(source);
  positiveInteger(factor);
  const target = blank(source.width * factor, source.height * factor);
  for (let y = 0; y < target.height; y++) {
    for (let x = 0; x < target.width; x++) {
      const s = (Math.floor(y / factor) * source.width + Math.floor(x / factor)) * 4;
      target.data.set(source.data.subarray(s, s + 4), (y * target.width + x) * 4);
    }
  }
  return target;
}
