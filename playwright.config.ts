import { defineConfig, devices } from '@playwright/test';
import { E2E_API_PROJECT, E2E_API_URL, e2eApiEnvironment } from './e2e/apiServer';

const IPHONE_SPECS = /iphone-[\w-]+\.spec\.ts/;

const apiMongoUri = process.env.E2E_MONGODB_URI ?? '';
const apiEnvironment = Object.entries(e2eApiEnvironment(apiMongoUri))
  .map(([name, value]) => `${name}=${value}`)
  .join(' ');

/** Local prerequisite: `VITE_API_URL=http://127.0.0.1:5010 pnpm --filter web build` */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    locale: 'fr-FR',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: IPHONE_SPECS,
    },
    {
      name: 'iphone-webkit',
      use: { browserName: 'webkit' },
      testMatch: IPHONE_SPECS,
    },
  ],
  // --no-launch-profile avoids port 4000 from launchSettings; without a profile, ASPNETCORE_* must force
  // Development, otherwise ProductionStartupValidation requires ALLOWED_ORIGINS + MONGODB_URI.
  // DevelopmentSeed__Enabled=false: the tests create their own accounts; the demo seed is not needed,
  // and its vote step crashes the host on a fresh seed (context without a current user).
  // TMDB_API_KEY=e2e-stub: SearchMoviesHandler requires a non-empty key even with the stub
  // (E2E_STUB_TMDB); a dummy value is enough, the stub ignores it. Without it, the search answers
  // "temporarily unavailable" in CI (no key), while locally a real key hides the issue.
  webServer: [
    {
      command: `cross-env ${apiEnvironment} dotnet run --project ${E2E_API_PROJECT} --no-launch-profile`,
      cwd: '.',
      url: `${E2E_API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm exec vite preview --host 127.0.0.1 --port 5174 --strictPort',
      cwd: 'apps/web',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
