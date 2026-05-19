import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    env: {
      VITE_API_URL: 'http://127.0.0.1:3999',
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: 'forks',
    forks: {
      maxForks: 4,
      minForks: 1,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/vite-env.d.ts', 'src/main.tsx'],
      thresholds: {
        lines: 55,
        functions: 65,
        branches: 63,
      },
    },
  },
});
