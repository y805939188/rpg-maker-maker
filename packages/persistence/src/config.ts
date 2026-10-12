import { lstat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
/** Operator configuration, never an HTTP/upload path. Roots belong to this project's .local. */
export async function resolveAssetRoot(
  env: Readonly<Record<string, string | undefined>>,
  projectRoot = process.cwd(),
) {
  const local = resolve(projectRoot, '.local'),
    value = env['TILESET_ASSET_ROOT'];
  if (value !== undefined && !value.trim()) throw Error('Asset root configuration is empty');
  const root = resolve(projectRoot, value ?? '.local/assets'),
    key = relative(local, root);
  if (
    !key ||
    isAbsolute(key) ||
    key === '..' ||
    key.startsWith('..' + sep) ||
    key.split(sep)[0]?.toLowerCase() === 'postgres'
  )
    throw Error('Asset root must be owned by this project .local and separate from PostgreSQL');
  // No existing ancestor may redirect the configured root outside its ownership boundary.
  const postgres = await lstat(resolve(local, 'postgres')).catch((error: unknown) => {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    return undefined;
  });
  let path = local;
  for (const part of ['', ...key.split(sep)]) {
    if (part) path = resolve(path, part);
    try {
      const stat = await lstat(path);
      if (stat.isSymbolicLink() || !stat.isDirectory())
        throw Error('Asset root ancestor must be a real directory');
      if (postgres && stat.dev === postgres.dev && stat.ino === postgres.ino)
        throw Error('Asset root ancestor aliases PostgreSQL storage');
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  return root;
}
