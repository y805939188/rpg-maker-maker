import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['apps/api/tests/studio/integration.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 180000,
    hookTimeout: 60000,
  },
});
