import { it, expect } from 'vitest';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { AssetStorage, verifyBackup } from '@tileset/persistence';
import { hashBytes } from '@tileset/asset-core';

const base = resolve('.local/step07/fix-round1/storage-tests');
const bytes = new TextEncoder().encode('immutable storage boundary control');
const build = 'a'.repeat(64);
async function fixture() {
  await mkdir(base, { recursive: true });
  const parent = await mkdtemp(resolve(base, 'owned-')),
    root = resolve(parent, 'owner/nested/assets'),
    storage = new AssetStorage(root),
    ref = await storage.put(bytes);
  await storage.publish(build, { 'bundle.json': bytes }, async (files) => {
    expect(files['bundle.json']).toEqual(bytes);
  });
  return { parent, root, storage, ref };
}
async function redirected(path: string, parent: string, action: () => Promise<void>) {
  const outside = resolve(parent, 'outside'),
    saved = path + '-preserved';
  await cp(path, outside, { recursive: true });
  await rename(path, saved);
  await symlink(outside, path);
  try {
    await action();
  } finally {
    await rename(path, resolve(parent, 'retained-link'));
    await rename(saved, path);
  }
}
it('ordinary storage remains readable and byte/hash/path validation remains mandatory', async () => {
  const s = await fixture();
  expect(await s.storage.read(s.ref)).toEqual(bytes);
  expect((await s.storage.buildFiles(build))['bundle.json']).toEqual(bytes);
  await expect(s.storage.read({ ...s.ref, sha256: '0'.repeat(64) })).rejects.toThrow();
  await expect(s.storage.read({ ...s.ref, bytes: s.ref.bytes + 1 })).rejects.toThrow();
  for (const key of ['../outside', 'objects/../outside', 'objects/' + 'b'.repeat(64) + '/other'])
    await expect(s.storage.read({ ...s.ref, key })).rejects.toThrow();
  expect((await s.storage.inventory()).builds).toEqual([build]);
});
it.each([
  'owner',
  'root',
  'objects',
  'builds',
  'stage',
  'build-directory',
  'object-leaf',
  'build-leaf',
])(
  'rejects a linked %s after initialization and reads the original again after restoration',
  async (part) => {
    const s = await fixture(),
      path = {
        owner: resolve(s.parent, 'owner'),
        root: s.root,
        objects: resolve(s.root, 'objects'),
        builds: resolve(s.root, 'builds'),
        stage: resolve(s.root, 'stage'),
        'build-directory': resolve(s.root, 'builds', build),
        'object-leaf': s.storage.path(s.ref.key),
        'build-leaf': resolve(s.root, 'builds', build, 'bundle.json'),
      }[part]!;
    await redirected(path, s.parent, async () => {
      if (['owner', 'root', 'objects', 'object-leaf'].includes(part))
        await expect(s.storage.read(s.ref)).rejects.toThrow();
      if (['owner', 'root', 'builds', 'build-directory', 'build-leaf'].includes(part))
        await expect(s.storage.buildFiles(build)).rejects.toThrow();
      if (part === 'stage') expect(await s.storage.read(s.ref)).toEqual(bytes);
      if (['owner', 'root', 'objects', 'builds', 'stage'].includes(part)) {
        await expect(s.storage.put(bytes, true)).rejects.toThrow();
        await expect(s.storage.inventory()).rejects.toThrow();
      }
    });
    expect(await s.storage.read(s.ref)).toEqual(bytes);
    expect((await s.storage.buildFiles(build))['bundle.json']).toEqual(bytes);
  },
);
it('pins real root identity, including missing roots, rather than accepting a same-byte replacement', async () => {
  const s = await fixture(),
    preserved = s.root + '-preserved',
    copy = resolve(s.parent, 'copy');
  await cp(s.root, copy, { recursive: true });
  await rename(s.root, preserved);
  await expect(s.storage.initialize()).rejects.toThrow('Storage root identity changed');
  await rename(copy, s.root);
  try {
    await expect(s.storage.read(s.ref)).rejects.toThrow('Storage root identity changed');
    await expect(s.storage.put(bytes)).rejects.toThrow('Storage root identity changed');
  } finally {
    await rename(s.root, copy);
    await rename(preserved, s.root);
  }
  expect(await s.storage.read(s.ref)).toEqual(bytes);
});
it('detects an ancestor replacement after opening a read descriptor, retaining all injected fixtures', async () => {
  const s = await fixture(),
    objects = resolve(s.root, 'objects'),
    saved = objects + '-preserved';
  const outside = resolve(s.parent, 'outside');
  await cp(objects, outside, { recursive: true });
  let injected = false;
  const reader = new AssetStorage(s.root, async (point) => {
    if (point === 'storage-file-read' && !injected) {
      injected = true;
      await rename(objects, saved);
      await symlink(outside, objects);
    }
  });
  try {
    await expect(reader.read(s.ref)).rejects.toThrow('symbolic link');
    expect(injected).toBe(true);
  } finally {
    if (injected) {
      await rename(objects, resolve(s.parent, 'retained-link'));
      await rename(saved, objects);
    }
  }
  expect(await reader.read(s.ref)).toEqual(bytes);
});
it('checks write ancestry again after validation and never publishes into the redirected objects directory', async () => {
  const s = await fixture(),
    objects = resolve(s.root, 'objects'),
    saved = objects + '-preserved';
  const outside = resolve(s.parent, 'outside');
  await cp(objects, outside, { recursive: true });
  let injected = false;
  const writer = new AssetStorage(s.root, async (point) => {
    if (point === 'file-validated' && !injected) {
      injected = true;
      await rename(objects, saved);
      await symlink(outside, objects);
    }
  });
  const next = new TextEncoder().encode('distinct unpublished source');
  try {
    await expect(writer.put(next, true)).rejects.toThrow('symbolic link');
    await expect(readFile(resolve(outside, hashBytes(next)))).rejects.toThrow();
  } finally {
    if (injected) {
      await rename(objects, resolve(s.parent, 'retained-link'));
      await rename(saved, objects);
    }
  }
  expect(await writer.read(s.ref)).toEqual(bytes);
});
it('backup verification rejects linked backup roots, nested directories and manifest leaves', async () => {
  const s = await fixture(),
    backup = resolve(s.parent, 'backup'),
    key = 'assets/objects/' + hashBytes(bytes);
  await mkdir(resolve(backup, 'assets/objects'), { recursive: true });
  await writeFile(resolve(backup, key), bytes);
  await writeFile(resolve(backup, 'database.dump'), bytes);
  const manifest = {
    contract: 'consistent-backup-v1',
    databaseDigest: 'b'.repeat(64),
    files: {
      [key]: { bytes: bytes.length, sha256: hashBytes(bytes) },
      'database.dump': { bytes: bytes.length, sha256: hashBytes(bytes) },
    },
  };
  await writeFile(resolve(backup, 'manifest.json'), JSON.stringify(manifest));
  // This exercises file inventory/hash verification only, not PostgreSQL dump or domain validity.
  expect((await verifyBackup(backup)).manifest).toEqual(manifest);
  for (const [i, path] of [
    backup,
    resolve(backup, 'assets'),
    resolve(backup, 'manifest.json'),
  ].entries()) {
    const parent = resolve(s.parent, 'injection-' + i);
    await mkdir(parent);
    await redirected(path, parent, async () => {
      await expect(verifyBackup(backup)).rejects.toThrow();
    });
    expect((await verifyBackup(backup)).manifest).toEqual(manifest);
  }
});

it('keeps an opened source stage descriptor owned when its ancestor is redirected, without writing outside', async () => {
  const s = await fixture(),
    stage = resolve(s.root, 'stage'),
    saved = stage + '-preserved',
    outside = resolve(s.parent, 'outside');
  await mkdir(outside);
  let injected = false;
  const writer = new AssetStorage(s.root, async (point) => {
    if (point === 'source-file-opened') {
      injected = true;
      await rename(stage, saved);
      await symlink(outside, stage);
    }
  });
  try {
    await expect(writer.put(bytes, true)).rejects.toThrow('symbolic link');
    expect(await readdir(outside)).toEqual([]);
    expect((await readdir(saved)).length).toBeGreaterThan(0);
  } finally {
    if (injected) {
      await rename(stage, resolve(s.parent, 'retained-link'));
      await rename(saved, stage);
    }
  }
  expect(await writer.read(s.ref)).toEqual(bytes);
});
it('checks the build destination again after validation and preserves old builds when publication is redirected', async () => {
  const s = await fixture(),
    builds = resolve(s.root, 'builds'),
    saved = builds + '-preserved',
    outside = resolve(s.parent, 'outside');
  await cp(builds, outside, { recursive: true });
  let injected = false;
  const publisher = new AssetStorage(s.root, async (point) => {
    if (point === 'build-validated') {
      injected = true;
      await rename(builds, saved);
      await symlink(outside, builds);
    }
  });
  try {
    await expect(
      publisher.publish('c'.repeat(64), { 'bundle.json': bytes }, async () => {}),
    ).rejects.toThrow('symbolic link');
    expect(await readdir(outside)).toEqual([build]);
  } finally {
    if (injected) {
      await rename(builds, resolve(s.parent, 'retained-link'));
      await rename(saved, builds);
    }
  }
  expect((await publisher.buildFiles(build))['bundle.json']).toEqual(bytes);
});
