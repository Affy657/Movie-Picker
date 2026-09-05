#!/bin/sh

sonar_join() {
  IFS=,
  printf %s "$*"
  unset IFS
}

EXCL=$(sonar_join \
  '**/node_modules/**' \
  '**/dist/**' \
  '**/dev-dist/**' \
  '**/coverage/**' \
  '**/build/**' \
  '**/.next/**' \
  '**/obj/**' \
  '**/bin/**' \
  '**/TestResults/**' \
  'archive/**' \
  'docs/**' \
  'e2e/**' \
  'scripts/**' \
  'apps/web/scripts/**' \
  'configs/**' \
  'infra/**' \
  'logs/**' \
  'test-results/**' \
  'artifacts/**' \
  '.github/**' \
  '.claude/**' \
  '.sonarqube/**' \
  '.turbo/**' \
  '**/*.yml' \
  '**/*.yaml' \
  '**/Dockerfile' \
  '**/Dockerfile.*' \
  'pnpm-lock.yaml' \
  '**/*.module.css' \
  '**/vite.config.ts' \
  '**/vitest.config.ts' \
  'prettier.config.cjs' \
  'eslint.config.mjs' \
  '**/*.stub.ts' \
  'apps/web/src/**/*.test.ts' \
  'apps/web/src/**/*.test.tsx' \
  '**/*.spec.ts' \
  '**/*.spec.tsx' \
  'apps/web/src/test-setup.ts' \
  'apps/web/src/test-utils/**' \
  'apps/web/src/mocks/**' \
  'apps/web/src/__mocks__/**' \
  'apps/web/src/vite-env.d.ts' \
  'apps/web/src/features/auth/devQuickLoginCredentials.ts' \
  'apps/web/src/shared/i18n/locales/*.ts' \
  'apps/api-dotnet/*.Tests/**' \
  'apps/api-dotnet/*.IntegrationTests/**' \
  'apps/api-dotnet/ToolGenDpKey/**' \
  'apps/api-dotnet/**/Infrastructure/Development/**'
)

CPD=$(sonar_join \
  'apps/web/src/**/locales/fr.ts' \
  'apps/web/src/**/locales/en.ts' \
  'apps/api-dotnet/**/Development/**'
)

COV_EXCL=$(sonar_join \
  'apps/web/src/main.tsx' \
  'apps/web/src/vite-env.d.ts' \
  'apps/web/vite.config.ts' \
  'prettier.config.cjs' \
  'apps/web/scripts/**' \
  'apps/web/src/sw.ts' \
  'apps/web/src/**/*.stub.ts' \
  'apps/web/src/shared/analytics/**' \
  'apps/web/src/app/components/AnalyticsSync.tsx' \
  'apps/web/src/features/events/components/SpinningWheel.tsx' \
  'apps/api-dotnet/**/Program.cs' \
  'apps/api-dotnet/**/Contracts/**' \
  'apps/api-dotnet/**/Configuration/**' \
  'apps/api-dotnet/**/Persistence/Mongo/*Document.cs' \
  'apps/api-dotnet/**/Persistence/Mongo/Mongo*.cs' \
  'apps/api-dotnet/**/Infrastructure/Posters/MongoPosterImageStore.cs' \
  'apps/api-dotnet/**/BackgroundServices/**'
)
