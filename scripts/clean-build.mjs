import { rm } from 'node:fs/promises';
for (const path of [
  'dist',
  'apps/api/dist',
  'apps/web/dist',
  'packages/contracts/dist',
  'packages/ai-gateway/dist',
  'packages/asset-core/dist',
  'packages/material-processing/dist',
  'packages/image-adapter/dist',
  'packages/mz-compiler/dist',
])
  await rm(new URL('../' + path, import.meta.url), { recursive: true, force: true });
