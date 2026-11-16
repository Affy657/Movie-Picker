export const E2E_API_URL = 'http://127.0.0.1:5010';

export const E2E_API_PROJECT = 'apps/api-dotnet/MoviePicker.Api/MoviePicker.Api.csproj';

export function e2eApiEnvironment(mongoUri: string): Record<string, string> {
  return {
    MOVIEPICKER_TEST_CONTEXT: '1',
    E2E_STUB_TMDB: '1',
    E2E_STUB_LETTERBOXD: '1',
    TMDB_API_KEY: 'e2e-stub',
    MONGODB_URI: mongoUri,
    DevelopmentSeed__Enabled: 'false',
    ASPNETCORE_ENVIRONMENT: 'Development',
    ASPNETCORE_URLS: E2E_API_URL,
  };
}
