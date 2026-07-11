import { defineConfig } from 'vitest/config';

// Dev-only test runner config. Not served on Hosting.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
