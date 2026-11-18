import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const coverageShard = process.env.VITEST_COVERAGE_SHARD === '1';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'virtual:pwa-register/react': path.resolve(
        __dirname,
        'src/__mocks__/virtual-pwa-register-react.ts'
      ),
      'virtual:color-mix-fallback.css': path.resolve(
        __dirname,
        'src/__mocks__/virtual-color-mix-fallback.css'
      ),
    },
  },
  test: {
    env: {
      VITE_API_URL: 'http://127.0.0.1:3999',
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'tooling/**/*.test.ts'],
    css: { include: [/src\/styles\/01-foundation\.css/] },
    setupFiles: ['vitest.vm-globals.ts', 'src/test-setup.ts'],
    testTimeout: 25000,
    hookTimeout: 25000,
    pool: 'vmForks',
    coverage: {
      provider: 'v8',
      reporter: coverageShard ? ['text-summary'] : ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stub.ts',
        'src/test-setup.ts',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/shared/analytics/**',
        'src/features/events/components/SpinningWheel.tsx',
      ],
      thresholds: coverageShard
        ? undefined
        : {
            statements: 84,
            lines: 86,
            functions: 81,
            branches: 77,
          },
    },
  },
});
