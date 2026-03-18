import { defineConfig, devices } from '@playwright/test';

/**
 * E2E : API .NET (stub TMDB) + front buildé avec VITE_API_URL vers l’API.
 * Prérequis local : `VITE_API_URL=http://127.0.0.1:5010 pnpm --filter web build`
 */
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
    trace: 'on-first-retry',
  },
  webServer:
    process.env.CI
      ? [
          {
            command: 'pnpm exec vite preview --host 127.0.0.1 --port 5174 --strictPort',
            cwd: 'apps/web',
            url: 'http://127.0.0.1:5174',
            reuseExistingServer: false,
            timeout: 60_000,
          },
        ]
      : [
          {
            command:
              'cross-env E2E_STUB_TMDB=1 MONGODB_URI= ASPNETCORE_URLS=http://127.0.0.1:5010 dotnet run --project apps/api-dotnet/MoviePicker.Api/MoviePicker.Api.csproj',
            cwd: '.',
            url: 'http://127.0.0.1:5010/health',
            reuseExistingServer: true,
            timeout: 120_000,
          },
          {
            command: 'pnpm exec vite preview --host 127.0.0.1 --port 5174 --strictPort',
            cwd: 'apps/web',
            url: 'http://127.0.0.1:5174',
            reuseExistingServer: true,
            timeout: 60_000,
          },
        ],
});
