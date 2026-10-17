import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'wavespeed';
import { z } from 'zod';
import { hashBytes } from '@tileset/asset-core';
import { inspectPng } from '@tileset/image-adapter';
import {
  renderFrozenPrompt,
  WAVESPEED_ADAPTER_VERSION,
  freezeTaskSnapshot,
} from '@tileset/ai-gateway';
import type { TaskSnapshot, ProviderAdapter, Submission, RemoteResult } from '@tileset/ai-gateway';

const API = 'https://api.wavespeed.ai/api/v3/';
export const RESULT_HOSTS = Object.freeze([
  'wavespeed-output.oss-cn-hangzhou.aliyuncs.com',
  'wavespeed-output.oss-accelerate.aliyuncs.com',
  'cdn.wavespeed.ai',
  'd2g64w682n9w0w.cloudfront.net',
]);
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/);
const inputsSchema = z
  .object({
    size: z.literal('256*256'),
    num_images: z.literal(1),
    output_format: z.literal('png'),
    enable_sync_mode: z.literal(false),
    enable_base64_output: z.literal(false),
    seed: z.number().int(),
    strength: z.number().min(0).max(1).optional(),
    num_inference_steps: z.number().int().min(1).max(50).optional(),
    guidance_scale: z.number().min(1).max(20).optional(),
  })
  .strict();
export type ReferenceReader = (
  reference: TaskSnapshot['references'][number],
  signal: AbortSignal,
) => Promise<Uint8Array>;
export interface SdkUploader {
  upload(path: string, options: { timeout: number }): Promise<string>;
}
/** SDK retry policy is explicit. run()/runNoThrow() hide the ID until polling ends, so submission/query use REST. */
export function waveSpeedSdk(key: string): SdkUploader {
  return new Client(key, {
    baseUrl: 'https://api.wavespeed.ai',
    maxRetries: 0,
    maxConnectionRetries: 0,
    connectionTimeout: 10,
    readTimeout: 30,
    clientName: 'ai-tileset-studio-step08',
  });
}
export function frozenWaveSpeedInput(snapshot: TaskSnapshot): Record<string, unknown> {
  const s = freezeTaskSnapshot(snapshot);
  if (
    s.model.provider !== 'wavespeed' ||
    s.model.adapterVersion !== WAVESPEED_ADAPTER_VERSION ||
    !['wavespeed-ai/flux-schnell', 'wavespeed-ai/flux-dev'].includes(s.model.modelId)
  )
    throw Error('FROZEN_MODEL_UNSUPPORTED');
  if (
    (s.taskKind === 'IMAGE_EDIT' &&
      (s.references.length !== 1 || s.model.modelId !== 'wavespeed-ai/flux-dev')) ||
    (s.taskKind === 'IMAGE_GENERATE' && s.references.length)
  )
    throw Error('REFERENCE_INPUT');
  return { ...inputsSchema.parse(s.model.parameters), prompt: renderFrozenPrompt(s) };
}
const envelope = z.object({ code: z.literal(200), data: z.record(z.unknown()) });
export class WaveSpeedAdapter implements ProviderAdapter {
  readonly provider = 'wavespeed' as const;
  readonly adapterVersion = WAVESPEED_ADAPTER_VERSION;
  constructor(
    private readonly key: string,
    private readonly sdk: SdkUploader,
    private readonly uploadRoot: string,
    private readonly references: ReferenceReader,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!key || /[\r\n]/.test(key)) throw Error('PROVIDER_KEY_MISSING');
  }
  private async request(path: string, method: 'POST' | 'GET', body: unknown, signal: AbortSignal) {
    // No automatic POST retry; never use provider-supplied query URLs.
    const response = await this.transport(new URL(path, API), {
      method,
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ProviderHttpError(response.status);
    }
    try {
      if (!response.body) throw Error('PROVIDER_PROTOCOL');
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          length += next.value.length;
          if (length > 64 * 1024 || chunks.length >= 1024) throw Error('PROVIDER_PROTOCOL');
          chunks.push(next.value);
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      return envelope.parse(JSON.parse(Buffer.concat(chunks).toString('utf8'))).data;
    } catch {
      throw Error('PROVIDER_PROTOCOL');
    }
  }
  async uploadReference(
    reference: TaskSnapshot['references'][number],
    signal: AbortSignal,
  ): Promise<string> {
    signal.throwIfAborted();
    const bytes = await this.references(reference, signal);
    inspectPng(bytes);
    if (hashBytes(bytes) !== reference.sha256) throw Error('REFERENCE_HASH');
    // SDK only accepts paths. This private file is created from a controlled asset ID, never from a caller path.
    const directory = await mkdtemp(join(this.uploadRoot, 'upload-'));
    try {
      const path = join(directory, 'reference.png');
      await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
      const url = await this.sdk.upload(path, { timeout: 30 });
      signal.throwIfAborted();
      const parsed = new URL(url);
      if (
        parsed.protocol !== 'https:' ||
        parsed.port ||
        parsed.username ||
        parsed.password ||
        !RESULT_HOSTS.includes(parsed.hostname)
      )
        throw Error('REFERENCE_UPLOAD_URL');
      return url;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  async quote(
    snapshot: TaskSnapshot,
    input: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<number> {
    const data = await this.request(
      'model/price',
      'POST',
      { model_id: snapshot.model.modelId, inputs: input },
      signal,
    );
    if (
      data['model_id'] !== snapshot.model.modelId ||
      data['currency'] !== 'USD' ||
      typeof data['price'] !== 'number' ||
      !Number.isFinite(data['price']) ||
      data['price'] < 0
    )
      throw Error('PRICE_UNVERIFIED');
    return data['price']; // Conservative full list price; no assumed discount.
  }
  async submitPrepared(
    snapshot: TaskSnapshot,
    input: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<Submission> {
    const frozen = frozenWaveSpeedInput(snapshot);
    if (
      JSON.stringify({ ...input, image: undefined }) !== JSON.stringify(frozen) ||
      (snapshot.taskKind === 'IMAGE_EDIT' && typeof input['image'] !== 'string')
    )
      return { outcome: 'REJECTED', code: 'PROVIDER_INPUT' };
    try {
      const data = await this.request(snapshot.model.modelId, 'POST', input, signal);
      const prediction = idSchema.safeParse(data['id']);
      return prediction.success
        ? { outcome: 'KNOWN', predictionId: prediction.data }
        : { outcome: 'UNKNOWN', reason: 'AMBIGUOUS_RESPONSE' };
    } catch (error) {
      if (
        error instanceof ProviderHttpError &&
        [400, 401, 402, 403, 404, 422].includes(error.status)
      )
        return { outcome: 'REJECTED', code: `PROVIDER_HTTP_${error.status}` };
      return { outcome: 'UNKNOWN', reason: 'CONNECTION_LOST' };
    }
  }
  async submit(snapshot: TaskSnapshot, signal: AbortSignal): Promise<Submission> {
    let input: Record<string, unknown>;
    try {
      input = frozenWaveSpeedInput(snapshot);
      if (snapshot.taskKind === 'IMAGE_EDIT')
        input['image'] = await this.uploadReference(snapshot.references[0]!, signal);
    } catch {
      return { outcome: 'REJECTED', code: 'PROVIDER_INPUT_OR_UPLOAD' };
    }
    return this.submitPrepared(snapshot, input, signal);
  }
  async query(predictionId: string, signal: AbortSignal): Promise<RemoteResult> {
    idSchema.parse(predictionId);
    const data = await this.request(`predictions/${predictionId}/result`, 'GET', undefined, signal);
    if (data['id'] !== predictionId) throw Error('PROVIDER_ID_MISMATCH');
    const status = data['status'];
    if (['failed', 'cancelled', 'timeout', 'deleted'].includes(String(status)))
      return { status: 'FAILED', code: `PROVIDER_${String(status).toUpperCase()}` };
    if (['created', 'pending', 'queued', 'processing', 'running'].includes(String(status)))
      return { status: 'RUNNING' };
    if (status !== 'completed') throw Error('PROVIDER_STATUS_UNKNOWN');
    const outputs = z.array(z.string().url().max(2048)).length(1).parse(data['outputs']);
    return { status: 'SUCCEEDED', outputs: outputs.map((url) => ({ url, expiresAt: null })) };
  }
}
class ProviderHttpError extends Error {
  constructor(readonly status: number) {
    super(`PROVIDER_HTTP_${status}`);
  }
}
