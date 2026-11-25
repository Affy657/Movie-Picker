import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/app/routes';

const { order } = vi.hoisted(() => ({ order: [] as string[] }));

vi.mock('react-dom/client', () => ({
  createRoot: () => ({
    render: () => {
      order.push('render');
    },
  }),
}));
vi.mock('@/shared/observability/sentry', () => ({
  scheduleSentryStart: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  startTransition: (scope: () => void) => {
    order.push('transition');
    scope();
  },
}));
vi.mock('@/app/App', () => ({ default: () => null }));
vi.mock('@/shared/hooks/usePwaInstall', () => ({ startPwaInstallRuntime: vi.fn() }));
vi.mock('@/shared/i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/i18n')>()),
  loadLocale: () => Promise.resolve(),
}));

function settle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bootOnDonatePage(documentBody: string): Promise<() => void> {
  vi.resetModules();
  document.body.innerHTML = documentBody;
  window.history.replaceState(null, '', ROUTES.donate);
  const { ROUTE_CHUNKS } = await import('@/app/routeChunks');
  let resolvePage!: (module: unknown) => void;
  vi.spyOn(ROUTE_CHUNKS, 'donate').mockReturnValue(
    new Promise((resolve) => {
      resolvePage = resolve;
    }) as never
  );
  await import('./main');
  return () => {
    order.push('page');
    resolvePage({ default: () => null });
  };
}

describe('startup page', () => {
  beforeEach(() => {
    order.length = 0;
    vi.restoreAllMocks();
  });

  it('keeps a prerendered document on screen until its page has loaded, then renders it in a transition', async () => {
    const pageLoads = await bootOnDonatePage(
      '<div id="root"><main><h1>Soutenir Movie Picker</h1></main></div>'
    );
    await settle(200);

    pageLoads();
    await vi.waitFor(() => expect(order).toContain('render'));

    expect(order).toEqual(['page', 'transition', 'render']);
  });

  it('paints the shell before the page when the document carries the splash screen', async () => {
    const pageLoads = await bootOnDonatePage('<div id="splash"></div><div id="root"></div>');
    await vi.waitFor(() => expect(order).toContain('render'));

    pageLoads();

    expect(order).toEqual(['render', 'page']);
  });
});
