import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import PwaAutoUpdate from '@/app/components/PwaAutoUpdate';

const { mockUseRegisterSW } = vi.hoisted(() => ({
  mockUseRegisterSW: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: mockUseRegisterSW,
}));

type RegisteredCallback = (url: string, r?: ServiceWorkerRegistration) => void;

function captureOnRegistered(): () => RegisteredCallback | undefined {
  let captured: RegisteredCallback | undefined;
  mockUseRegisterSW.mockImplementation((opts?: { onRegisteredSW?: RegisteredCallback }) => {
    captured = opts?.onRegisteredSW;
    return {
      needRefresh: [false, vi.fn()] as [boolean, (v: boolean) => void],
      offlineReady: [false, vi.fn()] as [boolean, (v: boolean) => void],
      updateServiceWorker: vi.fn(),
    };
  });
  return () => captured;
}

async function renderWithRegistration(update: ReturnType<typeof vi.fn>) {
  const getCallback = captureOnRegistered();
  const registration = { installing: null, update } as unknown as ServiceWorkerRegistration;
  const view = render(<PwaAutoUpdate />);
  await act(async () => {
    getCallback()?.('sw.js', registration);
  });
  return view;
}

describe('PwaAutoUpdate', () => {
  beforeEach(() => {
    mockUseRegisterSW.mockReset();
  });

  it("n'affiche aucune interface", async () => {
    const { container } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined));
    expect(container).toBeEmptyDOMElement();
  });

  it('cherche une mise à jour quand la connexion est rétablie', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const { unmount } = await renderWithRegistration(update);

    window.dispatchEvent(new Event('online'));

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledTimes(1);
    });

    unmount();
  });

  it('cherche une mise à jour à chaque changement de visibilité', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const { unmount } = await renderWithRegistration(update);

    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledTimes(1);
    });

    unmount();
  });

  it('ne cherche plus de mise à jour après démontage', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const { unmount } = await renderWithRegistration(update);

    unmount();
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(update).not.toHaveBeenCalled();
  });

  it('ne cherche pas de mise à jour hors ligne', async () => {
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      const update = vi.fn().mockResolvedValue(undefined);
      const { unmount } = await renderWithRegistration(update);

      window.dispatchEvent(new Event('online'));

      expect(update).not.toHaveBeenCalled();
      unmount();
    } finally {
      onLineSpy.mockRestore();
    }
  });
});
