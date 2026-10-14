import { strict as assert } from 'node:assert';
import { constants, type Stats } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, parse, relative, resolve, sep } from 'node:path';

type Kind = 'directory' | 'file';
type Entry = { path: string; stat: Stats };
type View = { path: string; kind: Kind; entries: Entry[]; missing: boolean };
function chain(path: string) {
  const base = parse(path).root;
  const result = [base];
  for (const part of relative(base, path).split(sep).filter(Boolean))
    result.push(resolve(result.at(-1)!, part));
  return result;
}
function inside(root: string, path: string) {
  const key = relative(root, path);
  return !isAbsolute(key) && key !== '..' && !key.startsWith('..' + sep);
}
function same(a: Stats, b: Stats) {
  return a.dev === b.dev && a.ino === b.ino;
}
/** Cooperative immutable-file protocol. Node path APIs do not provide an openat directory chain;
 * pre/post identity checks and owned descriptors detect observable replacement, not hostile ABA. */
export class PathBoundary {
  readonly root: string;
  #rootChain: Set<string>;
  #identities = new Map<string, Stats>();
  constructor(root: string) {
    this.root = resolve(root);
    this.#rootChain = new Set(chain(this.root));
  }
  async inspect(path: string, kind: Kind, missing = false): Promise<View> {
    path = resolve(path);
    assert.ok(inside(this.root, path), 'Storage path escaped its root');
    const entries: Entry[] = [];
    let absent = false;
    for (const current of chain(path)) {
      let stat: Stats;
      try {
        stat = await lstat(current);
      } catch (error) {
        assert.ok(!this.#identities.has(current), 'Storage root identity changed');
        if (!(missing && error instanceof Error && 'code' in error && error.code === 'ENOENT'))
          throw error;
        absent = true;
        break;
      }
      assert.ok(!stat.isSymbolicLink(), 'Storage path contains a symbolic link');
      assert.ok(
        current !== path || kind === 'directory' ? stat.isDirectory() : stat.isFile(),
        'Storage path has an invalid file type',
      );
      if (this.#rootChain.has(current)) {
        const saved = this.#identities.get(current);
        assert.ok(!saved || same(saved, stat), 'Storage root identity changed');
        this.#identities.set(current, stat);
      }
      entries.push({ path: current, stat });
    }
    if (entries.some((entry) => entry.path === this.root)) {
      const actualRoot = await realpath(this.root),
        last = entries.at(-1)!;
      assert.ok(
        inside(actualRoot, await realpath(last.path)),
        'Storage real path escaped its root',
      );
    }
    return { path, kind, entries, missing: absent };
  }
  async recheck(view: View, changeLeaf = false, missing = false) {
    const after = await this.inspect(view.path, view.kind, missing);
    for (const entry of view.entries) {
      if (changeLeaf && entry.path === view.path && entry.path !== this.root) continue;
      const current = after.entries.find((item) => item.path === entry.path);
      assert.ok(current && same(entry.stat, current.stat), 'Storage path identity changed');
    }
    return after;
  }
  async guarded<T>(
    path: string,
    kind: Kind,
    operation: () => Promise<T>,
    missing = false,
    changeLeaf = false,
  ) {
    const before = await this.inspect(path, kind, missing);
    const value = await operation();
    await this.recheck(before, changeLeaf, missing);
    return value;
  }
  async openFile(path: string, write = false) {
    const before = await this.inspect(path, 'file', write);
    const fd = await open(
      path,
      constants.O_NOFOLLOW |
        (write ? constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL : constants.O_RDONLY),
      0o600,
    );
    try {
      const after = await this.recheck(before),
        stat = await fd.stat();
      assert.ok(
        stat.isFile() && same(stat, after.entries.at(-1)!.stat),
        'Storage file identity changed',
      );
      return { fd, view: after };
    } catch (error) {
      await fd.close();
      throw error;
    }
  }
  async file<T>(path: string, operation: (fd: Awaited<ReturnType<typeof open>>) => Promise<T>) {
    const { fd, view } = await this.openFile(path);
    try {
      const value = await operation(fd);
      await this.recheck(view);
      return value;
    } finally {
      await fd.close();
    }
  }
  async directory(path: string) {
    return this.guarded(path, 'directory', () => readdir(path));
  }
}
