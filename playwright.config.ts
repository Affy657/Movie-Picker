import { defineConfig, devices } from '@playwright/test';

const apiMongoUri = process.env.E2E_MONGODB_URI ?? '';

/** Local prerequisite: `VITE_API_URL=http://127.0.0.1:5010 pnpm --filter web build` */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5174',
    locale: 'fr-FR',
    trace: 'on-first-retry',
  },
  // --no-launch-profile avoids port 4000 from launchSettings; without a profile, ASPNETCORE_* must force
  // Development, otherwise ProductionStartupValidation requires ALLOWED_ORIGINS + MONGODB_URI.
  // DevelopmentSeed__Enabled=false: the tests create their own accounts; the demo seed is not needed,
  // and its vote step crashes the host on a fresh seed (context without a current user).
  // TMDB_API_KEY=e2e-stub: SearchMoviesHandler requires a non-empty key even with the stub
  // (E2E_STUB_TMDB); a dummy value is enough, the stub ignores it. Without it, the search answers
  // "temporarily unavailable" in CI (no key), while locally a real key hides the issue.
  webServer: [
    {
      command: `cross-env MOVIEPICKER_TEST_CONTEXT=1 E2E_STUB_TMDB=1 E2E_STUB_LETTERBOXD=1 TMDB_API_KEY=e2e-stub MONGODB_URI=${apiMongoUri} DevelopmentSeed__Enabled=false ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://127.0.0.1:5010 dotnet run --project apps/api-dotnet/MoviePicker.Api/MoviePicker.Api.csproj --no-launch-profile`,
      cwd: '.',
      url: 'http://127.0.0.1:5010/health',
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
