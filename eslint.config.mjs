import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.cjs',
      'pnpm-lock.yaml',
      'artifacts/**',
      'apps/web/dist/**',
      'mcps/**',
      'apps/web/src/shared/api/generated/**',
    ],
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    ...sonarjs.configs.recommended,
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: [
      'apps/web/src/**/*.test.{ts,tsx}',
      'apps/web/src/**/*.stub.ts',
      'apps/web/src/test-setup.ts',
      'apps/web/src/test-utils/**',
      'apps/web/src/mocks/**',
      'apps/web/src/__mocks__/**',
      'apps/web/src/vite-env.d.ts',
      'apps/web/src/features/auth/devQuickLoginCredentials.ts',
      'apps/web/src/shared/i18n/locales/*.ts',
      'apps/web/src/**/generated/**',
    ],
  }
);
