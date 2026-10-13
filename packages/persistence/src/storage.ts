import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, rename, link, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hashBytes } from '@tileset/asset-core';
import type { GateLease } from './gate.js';
export type FileRef = Readonly<{ sha256: string; bytes: number; key: string }>;
export type FaultHook = (point: string) => Promise<void>;
export const noFault: FaultHook = async () => {};
async function syncDirectory(path: string) {
  const fd = await open(path, 'r');
  try {
    await fd.sync();
  } finally {
    await fd.close();
  }
}
export class AssetStorage {
  readonly root: string;
  constructor(
    root: string,
    readonly fault: FaultHook = noFault,
    readonly lease: () => GateLease | undefined = () => undefined,
  ) {
    this.root = resolve(root);
  }
  async checkpoint(signal?: AbortSignal) {
    signal?.throwIfAborted();
    await this.lease()?.checkpoint();
    signal?.throwIfAborted();
  }
  async step<T>(operation: () => Promise<T>, signal?: AbortSignal) {
    await this.checkpoint(signal);
    const value = await operation();
    await this.checkpoint(signal);
    return value;
  }
  async openWrite(path: string, cleanupOnFailure = false) {
    await this.checkpoint();
    const fd = await open(path, 'wx', 0o600);
    let identity: Awaited<ReturnType<typeof fd.stat>> | undefined;
    try {
      identity = await fd.stat();
      if (cleanupOnFailure) await this.fault('source-file-opened');
      await this.checkpoint();
      return fd;
    } catch (error) {
      await fd.close();
      if (cleanupOnFailure) {
        const current = await lstat(path).catch(() => undefined);
        if (identity && current?.dev === identity.dev && current.ino === identity.ino)
          await rm(path, { force: true });
      }
      throw error;
    }
  }
  path(key: string) {
    assert.match(key, /^(objects\/[a-f0-9]{64}|builds\/[a-f0-9]{64}\/[A-Za-z0-9.-]+)$/);
    return resolve(this.root, key);
  }
  async initialize() {
    await this.step(() => mkdir(this.root, { recursive: true, mode: 0o700 }));
    assert.ok((await lstat(this.root)).isDirectory() && !(await lstat(this.root)).isSymbolicLink());
    for (const d of ['objects', 'builds', 'stage']) {
      await this.step(() => mkdir(resolve(this.root, d), { recursive: true }));
      assert.ok(
        (await lstat(resolve(this.root, d))).isDirectory() &&
          !(await lstat(resolve(this.root, d))).isSymbolicLink(),
      );
    }
  }
  async read(ref: FileRef) {
    const path = this.path(ref.key),
      stat = await lstat(path);
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size === ref.bytes);
    const bytes = new Uint8Array(await readFile(path));
    assert.equal(hashBytes(bytes), ref.sha256);
    return bytes;
  }
  async put(input: Uint8Array, cleanupOnFailure = false): Promise<FileRef> {
    await this.checkpoint();
    const bytes = new Uint8Array(input);
    assert.ok(bytes.length > 0 && bytes.length <= 48 * 1024 * 1024);
    await this.initialize();
    const sha256 = hashBytes(bytes),
      ref = Object.freeze({ sha256, bytes: bytes.length, key: `objects/${sha256}` });
    const stage = resolve(this.root, 'stage', randomUUID());
    const fd = await this.openWrite(stage, cleanupOnFailure);
    let stageOwned = true,
      identity: Awaited<ReturnType<typeof fd.stat>> | undefined;
    try {
      try {
        identity = await fd.stat();
        await this.step(() => this.fault('file-write'));
        await this.step(() => fd.writeFile(bytes.subarray(0, Math.ceil(bytes.length / 2))));
        await this.step(() => this.fault('file-partial'));
        await this.step(() => fd.writeFile(bytes.subarray(Math.ceil(bytes.length / 2))));
        await this.step(() => fd.chmod(0o444));
        await this.step(() => fd.sync());
      } finally {
        await fd.close();
      }
      assert.equal(hashBytes(await readFile(stage)), sha256);
      await this.step(() => this.fault('file-validated'));
      try {
        await this.step(() => link(stage, this.path(ref.key)));
      } catch (e) {
        if (!(e instanceof Error && 'code' in e && e.code === 'EEXIST')) throw e;
        await this.read(ref);
      }
      await this.step(() => syncDirectory(resolve(this.root, 'objects')));
      await this.step(async () => {
        await rm(stage);
        stageOwned = false;
      });
      await this.checkpoint();
      return ref;
    } catch (error) {
      if (cleanupOnFailure && stageOwned && identity) {
        const current = await lstat(stage).catch(() => undefined);
        if (current?.dev === identity.dev && current.ino === identity.ino)
          await rm(stage, { force: true });
      }
      throw error;
    }
  }
  async publish(
    buildId: string,
    files: Readonly<Record<string, Uint8Array>>,
    verify: (files: Record<string, Uint8Array>) => Promise<unknown>,
  ) {
    await this.checkpoint();
    assert.match(buildId, /^[a-f0-9]{64}$/);
    await this.initialize();
    const target = resolve(this.root, 'builds', buildId);
    try {
      await lstat(target);
      const existing = await this.buildFiles(buildId);
      await verify(existing);
      for (const name of Object.keys(files)) assert.deepEqual(existing[name], files[name]);
      return;
    } catch (e) {
      if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT')) throw e;
    }
    const stage = resolve(this.root, 'stage', randomUUID());
    await this.step(() => mkdir(stage));
    for (const [name, input] of Object.entries(files)) {
      assert.match(name, /^[A-Za-z0-9][A-Za-z0-9.-]*$/);
      const bytes = new Uint8Array(input),
        fd = await this.openWrite(resolve(stage, name));
      try {
        await this.step(() => this.fault('build-file-write'));
        await this.step(() => fd.writeFile(bytes.subarray(0, Math.ceil(bytes.length / 2))));
        await this.step(() => this.fault('build-file-partial'));
        await this.step(() => fd.writeFile(bytes.subarray(Math.ceil(bytes.length / 2))));
        await this.step(() => fd.chmod(0o444));
        await this.step(() => fd.sync());
      } finally {
        await fd.close();
      }
    }
    const reread: Record<string, Uint8Array> = {};
    for (const name of await readdir(stage))
      reread[name] = new Uint8Array(await readFile(resolve(stage, name)));
    await this.step(() => verify(reread));
    await this.step(() => this.fault('build-validated'));
    await this.step(() => syncDirectory(stage));
    await this.step(() => rename(stage, target));
    await this.step(() => syncDirectory(resolve(this.root, 'builds')));
    await this.step(() => this.fault('files-durable'));
  }
  async buildFiles(buildId: string) {
    assert.match(buildId, /^[a-f0-9]{64}$/);
    const dir = resolve(this.root, 'builds', buildId);
    assert.ok((await lstat(dir)).isDirectory() && !(await lstat(dir)).isSymbolicLink());
    const files: Record<string, Uint8Array> = {};
    for (const name of await readdir(dir)) {
      assert.match(name, /^[A-Za-z0-9][A-Za-z0-9.-]*$/);
      const stat = await lstat(resolve(dir, name));
      assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 48 * 1024 * 1024);
      files[name] = new Uint8Array(await readFile(resolve(dir, name)));
    }
    return files;
  }
  // Crash stages and unreferenced immutable files are deliberately retained and locatable.
  async inventory() {
    await this.initialize();
    return {
      objects: (await readdir(resolve(this.root, 'objects'))).sort(),
      builds: (await readdir(resolve(this.root, 'builds'))).sort(),
      stages: (await readdir(resolve(this.root, 'stage'))).sort(),
    };
  }
}
