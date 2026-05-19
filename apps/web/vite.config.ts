import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devQuickLoginStub = path.resolve(
  __dirname,
  'src/features/auth/devQuickLoginCredentials.stub.ts'
);

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: [
      ...(mode === 'production'
        ? [
            {
              find: '@/features/auth/devQuickLoginCredentials',
              replacement: devQuickLoginStub,
            },
          ]
        : []),
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
}));
