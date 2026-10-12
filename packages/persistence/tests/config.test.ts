import { it, expect } from 'vitest';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveAssetRoot } from '@tileset/persistence';

it('owned roots reject reserved case names even when absent on a case-sensitive filesystem', async () => {
  await mkdir('.local/step06/fix-round2/config', { recursive: true });
  const project = await mkdtemp(resolve('.local/step06/fix-round2/config', 'owned-'));
  await mkdir(resolve(project, '.local/assets'), { recursive: true });
  await mkdir(resolve(project, '.local/postgres-assets'));
  await writeFile(resolve(project, '.local/non-directory'), 'file');
  await symlink(resolve(project, '.local/assets'), resolve(project, '.local/redirect'));
  for (const input of [
    '.local/postgres/absent',
    '.local/Postgres/absent',
    '.local/POSTGRES/absent',
    '.local/pOsTgReS',
    '.local',
    '.local/../outside',
    '',
    ' ',
    '.local/redirect/new',
    '.local/non-directory/new',
  ])
    await expect(resolveAssetRoot({ TILESET_ASSET_ROOT: input }, project)).rejects.toThrow();
  for (const input of ['.local/absent-assets/new', '.local/postgres-assets/new', '.local/assets'])
    expect(await resolveAssetRoot({ TILESET_ASSET_ROOT: input }, project)).toBe(
      resolve(project, input),
    );
  expect(await resolveAssetRoot({}, project)).toBe(resolve(project, '.local/assets'));
});
