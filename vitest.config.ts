import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',
      'packages/**/tests/**/*.test.ts',
      'apps/api/tests/**/*.test.ts',
    ],
    exclude: ['**/dist/**', '**/node_modules/**', '**/integration.test.ts'],
    testTimeout: 15000,
  },
});
