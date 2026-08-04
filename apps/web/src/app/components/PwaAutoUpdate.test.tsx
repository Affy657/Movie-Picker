import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import PwaAutoUpdate from '@/app/components/PwaAutoUpdate';

const { mockUseRegisterSW, mockUpdateSW } = vi.hoisted(() => ({
  mockUseRegisterSW: vi.fn(),
  mockUpdateSW: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: mockUseRegisterSW,
}));

type RegisteredCallback = (url: string, r?: ServiceWorkerRegistration) => void;

function setupHook(needRefresh: boolean): () => RegisteredCallback | undefined {
  let captured: RegisteredCallback | undefined;
  mockUseRegisterSW.mockImplementation((opts?: { onRegisteredSW?: RegisteredCallback }) => {
    captured = opts?.onRegisteredSW;
    return {
      needRefresh: [needRefresh, vi.fn()] as [boolean, (v: boolean) => void],
      offlineReady: [false, vi.fn()] as [boolean, (v: boolean) => void],
      updateServiceWorker: mockUpdateSW,
    };
  });
  return () => captured;
}

async function renderWithRegistration(update: ReturnType<typeof vi.fn>, needRefresh = false) {
  const getCallback = setupHook(needRefresh);
  const registration = { installing: null, update } as unknown as ServiceWorkerRegistration;
  const view = render(<PwaAutoUpdate />);
  await act(async () => {
    getCallback()?.('sw.js', registration);
  });
  return view;
}

function stubVisibility(state: DocumentVisibilityState) {
  return vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
}

function stubLocationReload() {
  const reload = vi.fn();
  vi.stubGlobal('location', { ...globalThis.location, reload });
  return reload;
}

let restoreServiceWorker: (() => void) | null = null;

function stubServiceWorkerContainer() {
  const container = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
  restoreServiceWorker = () => {
    if (original) Object.defineProperty(navigator, 'serviceWorker', original);
    else delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  };
  return container;
}

describe('PwaAutoUpdate', () => {
  beforeEach(() => {
    mockUseRegisterSW.mockReset();
    mockUpdateSW.mockReset();
    mockUpdateSW.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    restoreServiceWorker?.();
    restoreServiceWorker = null;
  });

  it("n'affiche aucune interface", async () => {
    const { container } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined));
    expect(container).toBeEmptyDOMElement();
  });

  describe('détection des nouvelles versions', () => {
    it('cherche une mise à jour quand la connexion est rétablie', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      const { unmount } = await renderWithRegistration(update);

      window.dispatchEvent(new Event('online'));

      await vi.waitFor(() => {
        expect(update).toHaveBeenCalledTimes(1);
      });

      unmount();
    });

    it('cherche une mise à jour en revenant sur la page (visibilitychange -> visible)', async () => {
      stubVisibility('visible');
      const update = vi.fn().mockResolvedValue(undefined);
      const { unmount } = await renderWithRegistration(update);

      document.dispatchEvent(new Event('visibilitychange'));

      await vi.waitFor(() => {
        expect(update).toHaveBeenCalledTimes(1);
      });

      unmount();
    });

    it('ne cherche pas de mise à jour au passage en arrière-plan (visibilitychange -> hidden)', async () => {
      stubVisibility('hidden');
      const update = vi.fn().mockResolvedValue(undefined);
      const { unmount } = await renderWithRegistration(update);

      document.dispatchEvent(new Event('visibilitychange'));

      expect(update).not.toHaveBeenCalled();

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
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const update = vi.fn().mockResolvedValue(undefined);
      const { unmount } = await renderWithRegistration(update);

      window.dispatchEvent(new Event('online'));

      expect(update).not.toHaveBeenCalled();
      unmount();
    });
  });

  describe('application différée de la mise à jour', () => {
    it("n'interrompt pas l'utilisateur : ne recharge pas tant que la page est visible", async () => {
      stubVisibility('visible');
      const { unmount } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined), true);

      expect(mockUpdateSW).not.toHaveBeenCalled();

      document.dispatchEvent(new Event('visibilitychange'));
      expect(mockUpdateSW).not.toHaveBeenCalled();

      unmount();
    });

    it('applique la mise à jour au passage en arrière-plan', async () => {
      const visibility = stubVisibility('visible');
      const { unmount } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined), true);

      expect(mockUpdateSW).not.toHaveBeenCalled();

      visibility.mockReturnValue('hidden');
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(mockUpdateSW).toHaveBeenCalledWith(true);

      unmount();
    });

    it('recharge la page dès que le nouveau worker prend le contrôle', async () => {
      stubVisibility('hidden');
      const container = stubServiceWorkerContainer();
      const { unmount } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined), true);

      expect(mockUpdateSW).toHaveBeenCalledWith(true);
      expect(container.addEventListener).toHaveBeenCalledWith(
        'controllerchange',
        expect.any(Function)
      );

      unmount();
    });

    it("recharge même si c'est un autre onglet qui a déclenché la mise à jour, sans jamais être passée en arrière-plan elle-même", async () => {
      stubVisibility('visible');
      const container = stubServiceWorkerContainer();
      const reload = stubLocationReload();
      const { unmount } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined), true);

      expect(mockUpdateSW).not.toHaveBeenCalled();

      const controllerChangeCall = container.addEventListener.mock.calls.find(
        ([event]) => event === 'controllerchange'
      );
      expect(controllerChangeCall).toBeDefined();
      const controllerChangeHandler = controllerChangeCall?.[1] as () => void;
      controllerChangeHandler();

      expect(reload).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('ne laisse pas le stub de navigator.serviceWorker fuiter vers les tests suivants', () => {
      expect(navigator.serviceWorker).toBeUndefined();
    });

    it("n'applique la mise à jour qu'une seule fois", async () => {
      stubVisibility('hidden');
      const { unmount } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined), true);

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(mockUpdateSW).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('applique immédiatement si la page est déjà en arrière-plan', async () => {
      stubVisibility('hidden');
      const { unmount } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined), true);

      expect(mockUpdateSW).toHaveBeenCalledWith(true);

      unmount();
    });

    it("n'applique rien tant qu'aucune version n'est en attente", async () => {
      stubVisibility('hidden');
      const { unmount } = await renderWithRegistration(vi.fn().mockResolvedValue(undefined), false);

      document.dispatchEvent(new Event('visibilitychange'));
      expect(mockUpdateSW).not.toHaveBeenCalled();

      unmount();
    });
  });
});
