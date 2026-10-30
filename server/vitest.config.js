import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 25000,
    hookTimeout: 25000,
    fileParallelism: false,
    include: ['tests/**/*.test.js']
  }
});
