import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'virtual:pwa-register/react': path.resolve(
        __dirname,
        'src/__mocks__/virtual-pwa-register-react.ts'
      ),
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
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test-setup.ts',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/shared/analytics/**',
        'src/app/components/AnalyticsSync.tsx',
        'src/features/events/components/SpinningWheel.tsx',
      ],
      thresholds: {
        lines: 55,
        functions: 65,
        branches: 60,
      },
    },
  },
});
