import { defineConfig } from '@playwright/test';
import { loadE2EEnvironment } from './e2e/environment.js';
const environment = loadE2EEnvironment();
const dev = process.env['E2E_MODE'] === 'dev';
const port = dev ? environment.WEB_PORT : environment.API_PORT;
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    viewport: { width: 1200, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: dev ? 'pnpm dev:start' : 'pnpm start',
    wait: { stdout: dev ? /^LOCAL_DEV_READY$/m : /^LOCAL_PRODUCTION_READY$/m },
    stdout: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: '.local/e2e/' + (dev ? 'dev' : 'production') + '.json' }],
  ],
});
