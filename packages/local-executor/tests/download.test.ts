import { describe, it, expect, vi } from 'vitest';
import { HttpsResultReader } from '../src/download.js';
const signal = () => new AbortController().signal;
describe('provider-independent bounded download', () => {
  it('accepts only exact HTTPS source hosts, rejects redirects, MIME and oversized bytes', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.redirect).toBe('error');
      expect(init?.headers).toBeUndefined(); // no provider key to object storage
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } });
    });
    const reader = new HttpsResultReader(['cdn.wavespeed.ai'], fetcher);
    for (const url of [
      'http://cdn.wavespeed.ai/a',
      'https://127.0.0.1/a',
      'https://cdn.wavespeed.ai.evil.test/a',
      'https://key@cdn.wavespeed.ai/a',
      'https://cdn.wavespeed.ai:8443/a',
      'file:///tmp/a',
    ])
      await expect(reader.bytes(url, signal())).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    expect(await reader.bytes('https://cdn.wavespeed.ai/a', signal())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    for (const response of [
      new Response('a', { status: 302 }),
      new Response('html', { headers: { 'content-type': 'text/html' } }),
      new Response('x', {
        headers: { 'content-type': 'image/png', 'content-length': String(4 * 1024 * 1024 + 1) },
      }),
      new Response(new Uint8Array(4 * 1024 * 1024 + 1), {
        headers: { 'content-type': 'image/png' },
      }),
    ])
      await expect(
        new HttpsResultReader(['cdn.wavespeed.ai'], async () => response).bytes(
          'https://cdn.wavespeed.ai/a',
          signal(),
        ),
      ).rejects.toThrow();
  });
});
