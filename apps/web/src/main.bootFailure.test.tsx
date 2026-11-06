import { describe, expect, it, vi } from 'vitest';
import { captureException, scheduleSentryStart } from '@/shared/observability/sentry';

vi.mock('@/shared/observability/sentry', () => ({
  scheduleSentryStart: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('@/app/App', () => {
  throw new Error('Failed to fetch dynamically imported module');
});
vi.mock('@/shared/hooks/usePwaInstall', () => ({ startPwaInstallRuntime: vi.fn() }));

describe('startup failure', () => {
  it('replaces the blank page with a way out, and still reports it', async () => {
    document.body.innerHTML = '<div id="splash"></div><div id="root"></div>';

    await import('./main');
    await vi.waitFor(() => expect(scheduleSentryStart).toHaveBeenCalled());

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(document.querySelector('#root [role="alert"] button')).toBeInTheDocument();
  });
});
