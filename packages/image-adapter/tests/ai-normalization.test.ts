import { it, expect } from 'vitest';
import sharp from 'sharp';
import { RawSource } from '@tileset/asset-core';
import { inspectPng, normalizeOpaqueRgbPng, decodeSource } from '../src/index.js';
it('explicit AI conversion adds only opaque alpha, keeps RGB pixels/size and still passes the strict source boundary', async () => {
  const pixels = Buffer.from([12, 34, 56, 98, 76, 54]);
  const original = new Uint8Array(
    await sharp(pixels, { raw: { width: 2, height: 1, channels: 3 } })
      .png()
      .toBuffer(),
  );
  expect(() => inspectPng(original)).toThrow('RGBA8');
  const normalized = await normalizeOpaqueRgbPng(original, new AbortController().signal);
  expect(inspectPng(normalized)).toEqual({ width: 2, height: 1 });
  const source = await decodeSource(
    new RawSource({
      id: 'rgb-conversion',
      revision: 1,
      role: 'grass',
      density: 1,
      encoding: 'png',
      bytes: normalized,
      provenance: {
        origin: 'ai',
        author: 'test',
        license: 'test',
        toolVersion: 'opaque-rgb-to-rgba8-v1',
        parents: [],
      },
    }),
  );
  expect(source.status).toBe('validated');
  if (source.status === 'validated')
    expect(source.source.image.bytes()).toEqual(new Uint8Array([12, 34, 56, 255, 98, 76, 54, 255]));
  expect(() => inspectPng(original)).toThrow('RGBA8');
  const corrupt = original.slice();
  corrupt[corrupt.length - 1] = corrupt[corrupt.length - 1]! ^ 1;
  await expect(normalizeOpaqueRgbPng(corrupt, new AbortController().signal)).rejects.toThrow();
  const over = await sharp({
    create: { width: 769, height: 577, channels: 3, background: '#223344' },
  })
    .png()
    .toBuffer();
  await expect(normalizeOpaqueRgbPng(over, new AbortController().signal)).rejects.toThrow(
    'pixel budget',
  );
});
