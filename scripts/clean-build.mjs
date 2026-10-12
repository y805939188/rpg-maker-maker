import { rm } from 'node:fs/promises';
for (const path of [
  'dist',
  'apps/api/dist',
  'apps/web/dist',
  'packages/contracts/dist',
  'packages/ai-gateway/dist',
])
  await rm(new URL('../' + path, import.meta.url), { recursive: true, force: true });
