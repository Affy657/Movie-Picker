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
    // Marge confortable pour éviter les timeouts MSW + userEvent (debounce, attente
    // de re-render) lorsqu'un run complet sature CPU/IO (typiquement Windows + coverage V8).
    testTimeout: 15000,
    hookTimeout: 15000,
    // Limite le nombre de forks parallèles : sur Windows les workers vitest peuvent
    // ne pas démarrer à temps quand le pool dépasse la capacité réelle (errors
    // « Failed to start forks worker / Timeout waiting for worker to respond »).
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 1,
      },
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
