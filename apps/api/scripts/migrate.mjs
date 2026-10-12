import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { parseConfig } from '../dist/config.js';
config({ path: new URL('../../../.env', import.meta.url), quiet: true });
try {
  parseConfig(process.env);
  const run = spawnSync(
    'pnpm',
    ['exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
    { stdio: 'inherit', env: process.env },
  );
  process.exitCode = run.status ?? 1;
} catch {
  console.error('Migration configuration invalid. Use a dedicated loopback tileset_ database.');
  process.exitCode = 1;
}
