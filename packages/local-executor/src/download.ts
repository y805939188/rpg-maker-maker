import type { ResultReader } from './executor.js';

/** Exact operator allowlist, HTTPS only, no redirects/credentials and no user URL API. */
export class HttpsResultReader implements ResultReader {
  constructor(
    private readonly hosts: readonly string[],
    private readonly transport: typeof fetch = fetch,
  ) {}
  async bytes(input: string, signal: AbortSignal): Promise<Uint8Array> {
    const url = new URL(input);
    if (
      url.protocol !== 'https:' ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      !this.hosts.includes(url.hostname) ||
      input.length > 2048
    )
      throw Error('RESULT_SOURCE_DENIED');
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(5000)]);
    const response = await this.transport(url, { redirect: 'error', signal: deadline });
    try {
      if (
        !response.ok ||
        response.headers.get('content-type')?.split(';')[0] !== 'image/png' ||
        !response.body
      )
        throw Error('RESULT_TYPE');
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > 4 * 1024 * 1024))
        throw Error('RESULT_BYTES');
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          deadline.throwIfAborted();
          const next = await reader.read();
          if (next.done) break;
          total += next.value.length;
          if (total > 4 * 1024 * 1024 || chunks.length >= 4096) throw Error('RESULT_BYTES');
          chunks.push(next.value.slice());
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      deadline.throwIfAborted();
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return bytes;
    } finally {
      await response.body?.cancel().catch(() => {});
    }
  }
}
