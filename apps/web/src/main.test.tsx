import { describe, expect, it, vi } from 'vitest';

const order: Array<string> = [];

vi.mock('react-dom/client', () => ({
  createRoot: () => ({
    render: () => {
      order.push('render');
    },
  }),
}));
vi.mock('@/shared/observability/sentry', () => ({
  scheduleSentryStart: () => {
    order.push('sentry');
  },
  captureException: vi.fn(),
}));
vi.mock('@/app/App', () => ({ default: () => null }));
vi.mock('@/shared/hooks/usePwaInstall', () => ({ startPwaInstallRuntime: vi.fn() }));

describe('démarrage', () => {
  it('monte React avant de demander le SDK Sentry', async () => {
    document.body.innerHTML = '<div id="splash"></div><div id="root"></div>';

    await import('./main');
    await vi.waitFor(() => expect(order).toContain('sentry'));

    expect(order).toEqual(['render', 'sentry']);
  });
});
