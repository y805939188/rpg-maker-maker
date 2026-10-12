import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'packages/persistence/tests/integration.test.ts',
      'packages/local-executor/tests/integration.test.ts',
      'packages/persistence/tests/fix-round1/integration.test.ts',
    ],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
