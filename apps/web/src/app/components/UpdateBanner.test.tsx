import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdateBanner from '@/app/components/UpdateBanner';
import { LocaleProvider } from '@/shared/i18n';

const { mockUpdateSW, mockSetNeedRefresh, mockUseRegisterSW } = vi.hoisted(() => ({
  mockUpdateSW: vi.fn(),
  mockSetNeedRefresh: vi.fn(),
  mockUseRegisterSW: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: mockUseRegisterSW,
}));

function makeReturn(needRefresh: boolean) {
  return {
    needRefresh: [needRefresh, mockSetNeedRefresh] as [boolean, (v: boolean) => void],
    offlineReady: [false, vi.fn()] as [boolean, (v: boolean) => void],
    updateServiceWorker: mockUpdateSW,
  };
}

function renderBanner() {
  return render(
    <LocaleProvider>
      <UpdateBanner />
    </LocaleProvider>
  );
}

describe('UpdateBanner', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    mockUpdateSW.mockResolvedValue(undefined);
    mockSetNeedRefresh.mockReset();
    mockUseRegisterSW.mockReturnValue(makeReturn(false));
  });

  it('ne rend rien quand aucune MAJ est disponible', () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('affiche le bandeau quand une MAJ est disponible', () => {
    mockUseRegisterSW.mockReturnValue(makeReturn(true));
    renderBanner();
    expect(screen.getByText('Nouvelle version disponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recharger/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ignorer/i })).toBeInTheDocument();
  });

  it('appelle updateServiceWorker(true) au clic sur Recharger', async () => {
    const user = userEvent.setup();
    mockUseRegisterSW.mockReturnValue(makeReturn(true));
    renderBanner();
    await user.click(screen.getByRole('button', { name: /recharger/i }));
    expect(mockUpdateSW).toHaveBeenCalledWith(true);
  });

  it('appelle setNeedRefresh(false) au clic sur Ignorer', async () => {
    const user = userEvent.setup();
    mockUseRegisterSW.mockReturnValue(makeReturn(true));
    renderBanner();
    await user.click(screen.getByRole('button', { name: /ignorer/i }));
    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
  });

  it('appelle registration.update() quand la connexion est rétablie', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      installing: null,
      update: mockUpdate,
    } as unknown as ServiceWorkerRegistration;

    let capturedCallback: ((url: string, r?: ServiceWorkerRegistration) => void) | undefined;

    mockUseRegisterSW.mockImplementation(
      (opts?: { onRegisteredSW?: (url: string, r?: ServiceWorkerRegistration) => void }) => {
        capturedCallback = opts?.onRegisteredSW;
        return makeReturn(false);
      }
    );

    const { unmount } = renderBanner();

    await act(async () => {
      capturedCallback?.('sw.js', mockRegistration);
    });

    window.dispatchEvent(new Event('online'));

    await vi.waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    unmount();
  });
});
