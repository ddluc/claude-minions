import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/cli/src/**/__tests__/**/*.test.ts'],
  },
});
