import { defineConfig, devices } from '@playwright/test';

/** Prérequis local : `VITE_API_URL=http://127.0.0.1:5010 pnpm --filter web build` */
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
  // --no-launch-profile évite le port 4000 des launchSettings ; sans profil, ASPNETCORE_* doit forcer Development
  // sinon ProductionStartupValidation exige ALLOWED_ORIGINS + MONGODB_URI.
  // DevelopmentSeed__Enabled=false : les tests créent leurs propres comptes ; le seed de démo
  // n'est pas requis et son étape de vote crashe l'hôte sur un seed frais (contexte sans user courant).
  webServer: [
    {
      command:
        'cross-env E2E_STUB_TMDB=1 MONGODB_URI= DevelopmentSeed__Enabled=false ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://127.0.0.1:5010 dotnet run --project apps/api-dotnet/MoviePicker.Api/MoviePicker.Api.csproj --no-launch-profile',
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
