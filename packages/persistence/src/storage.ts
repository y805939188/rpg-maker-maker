import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { constants, type Stats } from 'node:fs';
import { lstat, mkdir, open, rename, link, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hashBytes } from '@tileset/asset-core';
import type { GateLease } from './gate.js';
import { PathBoundary } from './paths.js';
export type FileRef = Readonly<{ sha256: string; bytes: number; key: string }>;
export type FaultHook = (point: string) => Promise<void>;
export const noFault: FaultHook = async () => {};
export class AssetStorage {
  readonly root: string;
  readonly paths: PathBoundary;
  constructor(
    root: string,
    readonly fault: FaultHook = noFault,
    readonly lease: () => GateLease | undefined = () => undefined,
  ) {
    this.root = resolve(root);
    this.paths = new PathBoundary(this.root);
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
    const { fd } = await this.paths.openFile(path, true);
    let identity: Stats | undefined;
    try {
      identity = await fd.stat();
      if (cleanupOnFailure) await this.fault('source-file-opened');
      await this.checkpoint();
      return fd;
    } catch (error) {
      await fd.close();
      if (cleanupOnFailure && identity) await this.cleanOwnedStage(path, identity);
      throw error;
    }
  }
  private async cleanOwnedStage(path: string, identity: { dev: number; ino: number }) {
    // A changed boundary is not ours to clean. Preserve the original failure and evidence.
    await this.paths
      .guarded(
        path,
        'file',
        async () => {
          const current = await lstat(path).catch(() => undefined);
          if (current?.dev === identity.dev && current.ino === identity.ino)
            await rm(path, { force: true });
        },
        true,
        true,
      )
      .catch(() => {});
  }
  private async syncDirectory(path: string) {
    await this.paths.guarded(path, 'directory', async () => {
      const fd = await open(
        path,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      );
      try {
        await fd.sync();
      } finally {
        await fd.close();
      }
    });
  }
  private async readFile(path: string, length?: number) {
    return this.paths.file(path, async (fd) => {
      await this.checkpoint();
      const stat = await fd.stat();
      assert.ok(stat.size > 0 && stat.size <= 48 * 1024 * 1024);
      if (length !== undefined) assert.equal(stat.size, length);
      await this.fault('storage-file-read');
      await this.checkpoint();
      const bytes = new Uint8Array(await fd.readFile({ signal: this.lease()?.signal }));
      assert.equal(bytes.length, stat.size);
      await this.checkpoint();
      return bytes;
    });
  }
  path(key: string) {
    assert.match(key, /^(objects\/[a-f0-9]{64}|builds\/[a-f0-9]{64}\/[A-Za-z0-9.-]+)$/);
    return resolve(this.root, key);
  }
  async initialize() {
    await this.step(() =>
      this.paths.guarded(
        this.root,
        'directory',
        () => mkdir(this.root, { recursive: true, mode: 0o700 }),
        true,
      ),
    );
    for (const d of ['objects', 'builds', 'stage']) {
      const path = resolve(this.root, d);
      await this.step(() =>
        this.paths.guarded(path, 'directory', () => mkdir(path, { recursive: true }), true),
      );
    }
  }
  async read(ref: FileRef) {
    const bytes = await this.readFile(this.path(ref.key), ref.bytes);
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
      identity: Stats | undefined;
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
      assert.equal(hashBytes(await this.readFile(stage, bytes.length)), sha256);
      await this.step(() => this.fault('file-validated'));
      try {
        await this.step(() =>
          this.paths.guarded(
            this.path(ref.key),
            'file',
            () => this.paths.guarded(stage, 'file', () => link(stage, this.path(ref.key))),
            true,
          ),
        );
      } catch (e) {
        if (!(e instanceof Error && 'code' in e && e.code === 'EEXIST')) throw e;
        await this.read(ref);
      }
      await this.step(() => this.syncDirectory(resolve(this.root, 'objects')));
      await this.step(async () => {
        await this.paths.guarded(stage, 'file', () => rm(stage), true, true);
        stageOwned = false;
      });
      await this.checkpoint();
      return ref;
    } catch (error) {
      if (cleanupOnFailure && stageOwned && identity) await this.cleanOwnedStage(stage, identity);
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
      await this.paths.inspect(target, 'directory');
      const existing = await this.buildFiles(buildId);
      await verify(existing);
      for (const name of Object.keys(files)) assert.deepEqual(existing[name], files[name]);
      return;
    } catch (e) {
      if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT')) throw e;
    }
    const stage = resolve(this.root, 'stage', randomUUID());
    await this.step(() => this.paths.guarded(stage, 'directory', () => mkdir(stage), true));
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
    for (const name of await this.paths.directory(stage))
      reread[name] = await this.readFile(resolve(stage, name));
    await this.step(() => verify(reread));
    await this.step(() => this.fault('build-validated'));
    await this.step(() => this.syncDirectory(stage));
    await this.step(() =>
      this.paths.guarded(
        target,
        'directory',
        () => this.paths.guarded(stage, 'directory', () => rename(stage, target), true, true),
        true,
      ),
    );
    await this.step(() => this.syncDirectory(resolve(this.root, 'builds')));
    await this.step(() => this.fault('files-durable'));
  }
  async buildFiles(buildId: string) {
    assert.match(buildId, /^[a-f0-9]{64}$/);
    const dir = resolve(this.root, 'builds', buildId);
    return this.paths.guarded(dir, 'directory', async () => {
      const files: Record<string, Uint8Array> = {};
      for (const name of await this.paths.directory(dir)) {
        assert.match(name, /^[A-Za-z0-9][A-Za-z0-9.-]*$/);
        files[name] = await this.readFile(resolve(dir, name));
      }
      return files;
    });
  }
  // Crash stages and unreferenced immutable files are deliberately retained and locatable.
  async inventory() {
    await this.initialize();
    return {
      objects: (await this.paths.directory(resolve(this.root, 'objects'))).sort(),
      builds: (await this.paths.directory(resolve(this.root, 'builds'))).sort(),
      stages: (await this.paths.directory(resolve(this.root, 'stage'))).sort(),
    };
  }
}
