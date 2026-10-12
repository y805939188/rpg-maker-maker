import { defineConfig } from '@playwright/test';
const dev = process.env['E2E_MODE'] === 'dev';
const port = Number(process.env[dev ? 'WEB_PORT' : 'API_PORT'] ?? (dev ? 5173 : 4310));
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
    command: dev ? 'pnpm dev' : 'pnpm start',
    url: `http://127.0.0.1:${dev ? Number(process.env['API_PORT'] ?? 4310) : port}/api/health`,
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: '.local/e2e/' + (dev ? 'dev' : 'production') + '.json' }],
  ],
});
