import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { freezeTaskSnapshot } from '@tileset/ai-gateway';
import type { ProviderAdapter, TaskSnapshot, Submission, RemoteResult } from '@tileset/ai-gateway';
import { freezeJson } from '@tileset/asset-core';
/** A test remote service with its own durable state. It owns no application DB or recovery. */
export class MockProvider implements ProviderAdapter {
  readonly provider = 'mock';
  readonly adapterVersion = 'mock-provider-v1';
  constructor(
    readonly root: string,
    readonly outputPng: Uint8Array,
    readonly hook: (point: string) => Promise<void> = async () => {},
  ) {}
  private path(id: string) {
    assert.match(id, /^[a-f0-9-]{36}$/);
    return resolve(this.root, id + '.json');
  }
  async submit(snapshot: TaskSnapshot, signal: AbortSignal): Promise<Submission> {
    signal.throwIfAborted();
    assert.equal(snapshot.model.adapterVersion, this.adapterVersion);
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    signal.throwIfAborted();
    const predictionId = randomUUID();
    const fd = await open(this.path(predictionId), 'wx', 0o600);
    try {
      signal.throwIfAborted();
      await fd.writeFile(
        JSON.stringify({
          id: predictionId,
          snapshot: freezeTaskSnapshot(snapshot),
          status: 'RUNNING',
          png: Buffer.from(new Uint8Array(this.outputPng)).toString('base64'),
        }),
      );
      signal.throwIfAborted();
      await fd.sync();
    } finally {
      await fd.close();
    }
    signal.throwIfAborted();
    const dir = await open(this.root, 'r');
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
    await this.hook('remote-created');
    signal.throwIfAborted();
    return { outcome: 'KNOWN', predictionId };
  }
  async query(id: string, signal: AbortSignal): Promise<RemoteResult> {
    signal.throwIfAborted();
    const job: unknown = JSON.parse(await readFile(this.path(id), 'utf8'));
    signal.throwIfAborted();
    assert.ok(job && typeof job === 'object' && 'status' in job);
    if (job.status === 'RUNNING') return { status: 'RUNNING' };
    assert.equal(job.status, 'SUCCEEDED');
    return { status: 'SUCCEEDED', outputs: [{ url: `mock://${id}/0`, expiresAt: null }] };
  }
  async complete(id: string) {
    const job: unknown = JSON.parse(await readFile(this.path(id), 'utf8'));
    assert.ok(job && typeof job === 'object');
    const stage = this.path(id) + '.' + randomUUID();
    const fd = await open(stage, 'wx', 0o600);
    try {
      await fd.writeFile(JSON.stringify({ ...job, status: 'SUCCEEDED' }));
      await fd.sync();
    } finally {
      await fd.close();
    }
    await rename(stage, this.path(id));
    const dir = await open(this.root, 'r');
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
  }
  async bytes(url: string, signal: AbortSignal) {
    signal.throwIfAborted();
    const u = new URL(url);
    assert.equal(u.protocol, 'mock:');
    assert.equal(u.pathname, '/0');
    const job: unknown = freezeJson(JSON.parse(await readFile(this.path(u.hostname), 'utf8')));
    assert.ok(
      job &&
        typeof job === 'object' &&
        'png' in job &&
        typeof job.png === 'string' &&
        job.png.length <= 5592408,
    );
    signal.throwIfAborted();
    const bytes = Buffer.from(job.png, 'base64');
    assert.equal(bytes.toString('base64'), job.png);
    return new Uint8Array(bytes);
  }
  async ids() {
    await mkdir(this.root, { recursive: true });
    return (await readdir(this.root))
      .filter((n) => /^[a-f0-9-]{36}\.json$/.test(n))
      .map((n) => n.slice(0, -5))
      .sort();
  }
  async cancel() {
    return 'UNSUPPORTED' as const;
  }
}
