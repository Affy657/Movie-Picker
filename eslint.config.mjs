import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import compat from 'eslint-plugin-compat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';
import { sonarA11yPlugin, sonarA11yRules } from './scripts/eslint-sonar-a11y.mjs';

const FEATURE_DETECTED_BROWSER_APIS = ['Notification'];

const SONAR_EXCLUDED_WEB_SOURCES = [
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
];

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
    ...compat.configs['flat/recommended'],
    files: ['apps/web/src/**/*.{ts,tsx}'],
    settings: { polyfills: FEATURE_DETECTED_BROWSER_APIS },
    ignores: [
      'apps/web/src/**/*.test.{ts,tsx}',
      'apps/web/src/test-setup.ts',
      'apps/web/src/test-utils/**',
      'apps/web/src/mocks/**',
      'apps/web/src/__mocks__/**',
    ],
  },
  {
    ...sonarjs.configs.recommended,
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: SONAR_EXCLUDED_WEB_SOURCES,
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: SONAR_EXCLUDED_WEB_SOURCES,
    plugins: { 'sonar-a11y': sonarA11yPlugin },
    rules: {
      ...sonarA11yRules,
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
    },
  },
  {
    files: ['apps/web/src/**/*.test.{ts,tsx}'],
    plugins: { sonarjs },
    rules: {
      'sonarjs/hooks-before-test-cases': 'error',
    },
  }
);
