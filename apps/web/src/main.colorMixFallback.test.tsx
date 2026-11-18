import { afterEach, describe, expect, it, vi } from 'vitest';

const loaded = vi.hoisted(() => ({ fallback: false }));

vi.mock('virtual:color-mix-fallback.css', () => {
  loaded.fallback = true;
  return {};
});
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: vi.fn() }) }));
vi.mock('@/shared/observability/sentry', () => ({
  scheduleSentryStart: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('@/app/App', () => ({ default: () => null }));
vi.mock('@/shared/hooks/usePwaInstall', () => ({ startPwaInstallRuntime: vi.fn() }));

async function bootWith(supportsColorMix: boolean) {
  loaded.fallback = false;
  vi.resetModules();
  vi.stubGlobal('CSS', { supports: () => supportsColorMix });
  document.body.innerHTML = '<div id="splash"></div><div id="root"></div>';
  await import('./main');
}

describe('colour-mix fallback at startup', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the computed colours on a Safari that ignores color-mix()', async () => {
    await bootWith(false);

    await vi.waitFor(() => expect(loaded.fallback).toBe(true));
  });

  it('leaves them out of every browser that reads color-mix()', async () => {
    await bootWith(true);
    await vi.dynamicImportSettled();

    expect(loaded.fallback).toBe(false);
  });
});
