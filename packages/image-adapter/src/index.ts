import {
  AssetError,
  RawSource,
  RgbaImage,
  requireRule,
  validatedDecodedSource,
} from '@tileset/asset-core';
import type { ValidatedSource } from '@tileset/asset-core';
import { PNG_POLICY, RepairRequired, inspectPng } from './png-policy.js';
import { runIsolated } from './isolation.js';
export { PNG_POLICY } from './png-policy.js';

export interface Diagnostic {
  readonly code: string;
  readonly message: string;
}
export type SourceResult =
  | {
      readonly status: 'validated';
      readonly source: ValidatedSource;
      readonly measurement: {
        readonly rssBytes: number;
        readonly durationMs: number;
        readonly versions: Readonly<Record<string, string>>;
      };
    }
  | { readonly status: 'rejected' | 'repair-required'; readonly diagnostic: Diagnostic };
let reading = false;

/** Pull bounded chunks before storing them. This ingress accepts bytes, never a server path. */
export async function readBoundedPng(stream: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  requireRule(!reading, 'READ_BUSY', 'Source read concurrency budget is exhausted.');
  reading = true;
  try {
    return await pullPng(stream);
  } finally {
    reading = false;
  }
}
async function pullPng(stream: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const iterator = stream[Symbol.asyncIterator](),
    chunks: Uint8Array[] = [];
  let total = 0;
  const started = performance.now();
  try {
    while (true) {
      const remaining = PNG_POLICY.readDeadlineMs - (performance.now() - started);
      requireRule(remaining > 0, 'READ_TIMEOUT', 'Source read deadline exceeded.');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const next = await Promise.race([
        iterator.next(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new AssetError('READ_TIMEOUT', 'Source read deadline exceeded.')),
            remaining,
          );
        }),
      ]).finally(() => clearTimeout(timer));
      if (next.done) break;
      requireRule(
        next.value instanceof Uint8Array && next.value.length > 0,
        'READ_CHUNK',
        'Input chunks must contain bytes.',
      );
      total += next.value.length;
      requireRule(
        total <= PNG_POLICY.encodedBytes,
        'ENCODED_LIMIT',
        'Source read exceeded the encoded byte budget before storage allocation.',
      );
      chunks.push(new Uint8Array(next.value));
      requireRule(
        chunks.length <= PNG_POLICY.chunks,
        'READ_CHUNKS',
        'Source read chunk budget exceeded.',
      );
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    inspectPng(bytes);
    return bytes;
  } finally {
    // Do not await a producer that itself ignores cancellation or stalls on return().
    if (iterator.return) void iterator.return().catch(() => {});
  }
}
export async function decodeSource(raw: RawSource): Promise<SourceResult> {
  try {
    requireRule(
      raw instanceof RawSource && raw.encoding === 'png',
      'SOURCE_ENCODING',
      'PNG adapter requires an owned PNG RawSource.',
    );
    const bytes = raw.bytes();
    const dimensions = inspectPng(bytes);
    const result = await runIsolated({
      operation: 'decode',
      bytes: Buffer.from(bytes).toString('base64'),
    });
    requireRule(
      typeof result.bytes === 'string' &&
        result.bytes.length <= Math.ceil((PNG_POLICY.pixels * 4) / 3) * 4 &&
        result.width === dimensions.width &&
        result.height === dimensions.height,
      'CODEC_RESULT',
      'Codec output must fit the decoded budget.',
    );
    const source = validatedDecodedSource(raw, {
      ...dimensions,
      data: Buffer.from(result.bytes, 'base64'),
    });
    return Object.freeze({
      status: 'validated',
      source,
      measurement: Object.freeze({
        rssBytes: result.rssBytes,
        durationMs: result.durationMs,
        versions: Object.freeze({ ...result.versions }),
      }),
    });
  } catch (error) {
    const diagnostic =
      error instanceof AssetError
        ? { code: error.code, message: error.message }
        : { code: 'SOURCE_INVALID', message: 'Source did not pass validation.' };
    return Object.freeze({
      status: error instanceof RepairRequired ? 'repair-required' : 'rejected',
      diagnostic: Object.freeze(diagnostic),
    });
  }
}
export async function ingestPng(
  stream: AsyncIterable<Uint8Array>,
  descriptor: Omit<ConstructorParameters<typeof RawSource>[0], 'bytes' | 'encoding'>,
): Promise<SourceResult> {
  try {
    return await decodeSource(
      new RawSource({ ...descriptor, encoding: 'png', bytes: await readBoundedPng(stream) }),
    );
  } catch (error) {
    return Object.freeze({
      status: error instanceof RepairRequired ? 'repair-required' : 'rejected',
      diagnostic: Object.freeze(
        error instanceof AssetError
          ? { code: error.code, message: error.message }
          : { code: 'SOURCE_INVALID', message: 'Source did not pass validation.' },
      ),
    });
  }
}
export async function encodePng(image: RgbaImage): Promise<Uint8Array> {
  requireRule(image instanceof RgbaImage, 'SOURCE_STATE', 'Expected owned validated RGBA pixels.');
  const result = await runIsolated({
    operation: 'encode',
    bytes: Buffer.from(image.bytes()).toString('base64'),
    width: image.width,
    height: image.height,
  });
  requireRule(
    typeof result.bytes === 'string' &&
      result.bytes.length <= Math.ceil(PNG_POLICY.encodedBytes / 3) * 4,
    'ENCODED_LIMIT',
    'Encoded output exceeds budget.',
  );
  const bytes = new Uint8Array(Buffer.from(result.bytes, 'base64'));
  inspectPng(bytes);
  return bytes;
}
export async function codecRuntime(): Promise<Readonly<Record<string, string>>> {
  return Object.freeze({ ...(await runIsolated({ operation: 'runtime' })).versions });
}
