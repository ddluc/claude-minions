import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/cli/**/__tests__/**/*.test.ts'],
  },
});
