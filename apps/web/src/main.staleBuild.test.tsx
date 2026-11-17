import { lazy } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import { LocaleProvider } from '@/shared/i18n';
import { STALE_BUILD_RELOAD_KEY } from '@/shared/pwa/staleBuildReload';

vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: vi.fn() }),
}));
vi.mock('@/shared/observability/sentry', () => ({
  scheduleSentryStart: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('@/app/App', () => ({ default: () => null }));
vi.mock('@/shared/hooks/usePwaInstall', () => ({ startPwaInstallRuntime: vi.fn() }));

function failLikeAMissingChunkOfTheLastBuild(): Promise<never> {
  const error = new TypeError(
    'Failed to fetch dynamically imported module: /assets/Gone-1a2b3c.js'
  );
  const preloadError = new Event('vite:preloadError', { cancelable: true });
  Object.assign(preloadError, { payload: error });
  window.dispatchEvent(preloadError);
  return Promise.reject(error);
}

function reloadWasRequested(): boolean {
  return sessionStorage.getItem(STALE_BUILD_RELOAD_KEY) !== null;
}

function IdlePrefetch({ loaders }: Readonly<{ loaders: ReadonlyArray<() => Promise<unknown>> }>) {
  useIdlePrefetch(loaders);
  return null;
}

describe('stale build reload', () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="splash"></div><div id="root"></div>';
    await import('./main');
  });

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('never reloads the page for an idle prefetch nobody waits for', async () => {
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelIdleCallback', () => undefined);
    const loader = vi.fn(failLikeAMissingChunkOfTheLastBuild);

    render(<IdlePrefetch loaders={[loader]} />);
    await waitFor(() => expect(loader).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(reloadWasRequested()).toBe(false);
  });

  it('still reloads the page when the chunk of the page being shown is gone', async () => {
    const MissingPage = lazy(failLikeAMissingChunkOfTheLastBuild);

    render(
      <LocaleProvider>
        <MemoryRouter>
          <ErrorBoundary>
            <MissingPage />
          </ErrorBoundary>
        </MemoryRouter>
      </LocaleProvider>
    );
    await screen.findByRole('heading', { name: /problème est survenu/i });

    expect(reloadWasRequested()).toBe(true);
  });
});
