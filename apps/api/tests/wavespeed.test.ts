import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { composeTaskSnapshot } from '@tileset/ai-gateway';
import { hashBytes } from '@tileset/asset-core';
import { RgbaImage } from '@tileset/asset-core';
import { encodePng } from '@tileset/image-adapter';
import { WaveSpeedAdapter, frozenWaveSpeedInput, RESULT_HOSTS } from '../src/wavespeed-adapter.js';
import { HttpsResultReader } from '@tileset/local-executor';
import { readProviderConfiguration } from '../src/ai-provider-config.js';
const secret = 'test-secret-never-persist-4808';
const target = { id: 'native-mz', version: '1' };
const signal = () => new AbortController().signal;
const response = (data: unknown) =>
  new Response(JSON.stringify({ code: 200, data }), {
    headers: { 'content-type': 'application/json' },
  });
describe('WaveSpeed protocol adapter (offline, injected transport only)', () => {
  it('submits once, returns ID immediately, queries exactly that ID and maps sanitized terminal errors', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const transport = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${secret}`);
      calls.push({ url: String(url), body: init?.body });
      return response(
        calls.length === 1
          ? { id: 'prediction_1' }
          : {
              id: 'prediction_1',
              status: calls.length === 2 ? 'processing' : 'completed',
              outputs: ['https://cdn.wavespeed.ai/output.png'],
            },
      );
    });
    const adapter = new WaveSpeedAdapter(
      secret,
      { upload: vi.fn() },
      '/unused',
      async () => new Uint8Array(),
      transport,
    );
    const task = composeTaskSnapshot({ component: 'grass', operation: 'IMAGE_GENERATE' }, target);
    expect(await adapter.submit(task, signal())).toEqual({
      outcome: 'KNOWN',
      predictionId: 'prediction_1',
    });
    expect(calls).toHaveLength(1);
    expect(await adapter.query('prediction_1', signal())).toEqual({ status: 'RUNNING' });
    expect(await adapter.query('prediction_1', signal())).toEqual({
      status: 'SUCCEEDED',
      outputs: [{ url: 'https://cdn.wavespeed.ai/output.png', expiresAt: null }],
    });
    expect(calls[1]!.url).toBe('https://api.wavespeed.ai/api/v3/predictions/prediction_1/result');
    expect(JSON.stringify(calls.map((call) => call.body))).not.toContain(secret);
    const objectFetch = vi.fn(
      async () => new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/png' } }),
    );
    const download = new HttpsResultReader(RESULT_HOSTS, objectFetch);
    expect(
      await download.bytes('https://d2h7xmz5gqybh9.cloudfront.net/output/test.png', signal()),
    ).toEqual(new Uint8Array([1]));
    await expect(
      download.bytes('https://d2h7xmz5gqybh9.cloudfront.net.evil.test/output/test.png', signal()),
    ).rejects.toThrow('RESULT_SOURCE_DENIED');
    expect(objectFetch).toHaveBeenCalledTimes(1);
  });
  it('does not retry unknown submission or trust malformed output, IDs or supplier error bodies', async () => {
    const snapshot = composeTaskSnapshot(
      { component: 'water', operation: 'IMAGE_GENERATE' },
      target,
    );
    for (const [reply, outcome] of [
      [() => Promise.reject(Error(secret)), 'UNKNOWN'],
      [() => Promise.resolve(new Response(secret, { status: 503 })), 'UNKNOWN'],
      [() => Promise.resolve(new Response(secret, { status: 401 })), 'REJECTED'],
      [() => Promise.resolve(response({})), 'UNKNOWN'],
    ] as const) {
      const transport = vi.fn(reply);
      const adapter = new WaveSpeedAdapter(
        secret,
        { upload: vi.fn() },
        '/unused',
        async () => new Uint8Array(),
        transport,
      );
      const result = await adapter.submit(snapshot, signal());
      expect(result.outcome).toBe(outcome);
      expect(transport).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(result)).not.toContain(secret);
    }
    const transport = vi.fn(async () =>
      response({ id: 'other', status: 'completed', outputs: [] }),
    );
    const adapter = new WaveSpeedAdapter(
      secret,
      { upload: vi.fn() },
      '/unused',
      async () => new Uint8Array(),
      transport,
    );
    await expect(adapter.query('../evil', signal())).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    await expect(adapter.query('wanted', signal())).rejects.toThrow('PROVIDER_ID_MISMATCH');
    expect(() =>
      frozenWaveSpeedInput({
        ...snapshot,
        model: { ...snapshot.model, parameters: { ...snapshot.model.parameters, num_images: 4 } },
      }),
    ).toThrow();
  });
  it('uploads only verified controlled bytes via SDK, cleans its own temp file and sends the returned reference', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'step08-sdk-'));
    const png = await encodePng(
      new RgbaImage({ width: 256, height: 256, data: new Uint8Array(256 * 256 * 4) }),
    );
    const reference = {
      assetId: '9ead7c5f-ea94-49d6-9b82-a1930e740c7b',
      revision: '1',
      sha256: hashBytes(png),
    };
    let temporary = '';
    const sdk = {
      upload: vi.fn(async (path: string) => {
        temporary = path;
        expect(await readFile(path)).toEqual(Buffer.from(png));
        return 'https://cdn.wavespeed.ai/reference.png';
      }),
    };
    const transport = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body)).image).toBe('https://cdn.wavespeed.ai/reference.png');
      return response({ id: 'edit_1' });
    });
    const adapter = new WaveSpeedAdapter(secret, sdk, root, async () => png, transport);
    const snapshot = composeTaskSnapshot({ component: 'grass', operation: 'IMAGE_EDIT' }, target, [
      reference,
      { ...reference, assetId: '2db41d81-ddb2-4cf3-90a0-f86effb1c165' },
    ]);
    expect(await adapter.submit(snapshot, signal())).toEqual({
      outcome: 'KNOWN',
      predictionId: 'edit_1',
    });
    expect(sdk.upload).toHaveBeenCalledTimes(1);
    await expect(readFile(temporary)).rejects.toThrow();
    const bad = new WaveSpeedAdapter(
      secret,
      sdk,
      root,
      async () => new Uint8Array([1, 2]),
      transport,
    );
    expect(await bad.submit(snapshot, signal())).toEqual({
      outcome: 'REJECTED',
      code: 'PROVIDER_INPUT_OR_UPLOAD',
    });
    expect(transport).toHaveBeenCalledTimes(1);
    const wrongSize = new Uint8Array(await readFile('tests/fixtures/art-ground.png'));
    const wrongRef = {
      ...reference,
      assetId: '2db41d81-ddb2-4cf3-90a0-f86effb1c165',
      sha256: hashBytes(wrongSize),
    };
    const wrongTask = composeTaskSnapshot({ component: 'grass', operation: 'IMAGE_EDIT' }, target, [
      reference,
      wrongRef,
    ]);
    const mismatched = new WaveSpeedAdapter(secret, sdk, root, async () => wrongSize, transport);
    expect((await mismatched.submit(wrongTask, signal())).outcome).toBe('REJECTED');
    expect(sdk.upload).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('loads only the explicit private file as data; no eval, process env mutation or secret echo', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'step08-config-'));
    await mkdir(resolve(root, 'private'));
    const path = resolve(root, 'private/provider.env');
    await writeFile(path, `WAVESPEED_API_KEY=${secret}\nSTEP08_REAL_API_TEST_BUDGET_USD=5.00\n`);
    const before = process.env['WAVESPEED_API_KEY'];
    expect(await readProviderConfiguration(path)).toEqual({ key: secret, budgetUsd: 5 });
    expect(process.env['WAVESPEED_API_KEY']).toBe(before);
    await writeFile(
      path,
      'WAVESPEED_API_KEY=$(touch /tmp/not-run)\nSTEP08_REAL_API_TEST_BUDGET_USD=1',
    );
    await expect(readProviderConfiguration(path)).rejects.toThrow(
      'PROVIDER_KEY_MISSING_OR_INVALID',
    );
    await writeFile(path, `WAVESPEED_API_KEY=${secret}\nSTEP08_REAL_API_TEST_BUDGET_USD=-1`);
    await expect(readProviderConfiguration(path)).rejects.toThrow('PROVIDER_BUDGET_INVALID');
  });
});
