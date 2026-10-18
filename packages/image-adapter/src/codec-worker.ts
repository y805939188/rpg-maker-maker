import sharp from 'sharp';
import {
  AssetError,
  MAX_ENCODED_BYTES,
  MAX_PIXELS,
  RgbaImage,
  requireRule,
} from '@tileset/asset-core';
import type { CodecRequest, CodecResult } from './isolation.js';
import { inspectPng, inspectConvertiblePng } from './png-policy.js';

// Each job owns one child and one libvips worker; native cache is disabled.
sharp.cache(false);
sharp.concurrency(1);
process.once('message', (request: CodecRequest) => {
  void (async () => {
    const start = performance.now();
    let result: Partial<CodecResult> = {};
    if (request.operation === 'decode' || request.operation === 'normalize-opaque-rgb') {
      requireRule(
        typeof request.bytes === 'string' &&
          request.bytes.length <= Math.ceil(MAX_ENCODED_BYTES / 3) * 4,
        'ENCODED_LIMIT',
        'Encoded budget exceeded.',
      );
      const bytes = Buffer.from(request.bytes, 'base64');
      const normalize = request.operation === 'normalize-opaque-rgb';
      const expected = normalize ? inspectConvertiblePng(bytes) : inspectPng(bytes);
      const codec = sharp(bytes, {
        limitInputPixels: MAX_PIXELS,
        failOn: 'warning',
        autoOrient: false,
      });
      const metadata = await codec.metadata();
      requireRule(
        metadata.format === 'png' &&
          (metadata.channels === 4 || (normalize && metadata.channels === 3)) &&
          metadata.depth === 'uchar' &&
          metadata.space === 'srgb' &&
          !metadata.icc &&
          !metadata.exif &&
          (metadata.pages ?? 1) === 1,
        'CODEC_FORMAT',
        'Decoded representation must match the container policy.',
      );
      const { data, info } = await (normalize ? codec.ensureAlpha() : codec)
        .raw()
        .toBuffer({ resolveWithObject: true });
      requireRule(
        info.width === expected.width && info.height === expected.height && info.channels === 4,
        'CODEC_DIMENSIONS',
        'Decoder dimensions changed.',
      );
      new RgbaImage({ width: info.width, height: info.height, data });
      if (normalize) {
        const encoded = await sharp(data, {
          raw: { width: info.width, height: info.height, channels: 4 },
        })
          .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
          .toBuffer();
        inspectPng(encoded);
        result = { bytes: encoded.toString('base64'), width: info.width, height: info.height };
      } else result = { bytes: data.toString('base64'), width: info.width, height: info.height };
    } else if (request.operation === 'encode') {
      requireRule(
        typeof request.bytes === 'string' &&
          request.bytes.length <= Math.ceil((MAX_PIXELS * 4) / 3) * 4 &&
          typeof request.width === 'number' &&
          typeof request.height === 'number',
        'RGBA_LENGTH',
        'Invalid bounded encoder request.',
      );
      const image = new RgbaImage({
        width: request.width,
        height: request.height,
        data: Buffer.from(request.bytes, 'base64'),
      });
      const data = await sharp(image.bytes(), {
        raw: { width: image.width, height: image.height, channels: 4 },
      })
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
        .toBuffer();
      inspectPng(data);
      result = { bytes: data.toString('base64'), width: image.width, height: image.height };
    } else
      requireRule(request.operation === 'runtime', 'CODEC_REQUEST', 'Invalid codec operation.');
    process.send?.({
      ok: true,
      result: {
        ...result,
        versions: sharp.versions,
        rssBytes: process.memoryUsage().rss,
        durationMs: performance.now() - start,
      },
    });
  })().catch((error: unknown) =>
    process.send?.({ ok: false, code: error instanceof AssetError ? error.code : 'CODEC_FAILURE' }),
  );
});
// A bounded diagnostic handshake distinguishes module startup from native work.
// It does not reset or extend the parent's existing wall-clock deadline.
process.send?.({ ready: true });
