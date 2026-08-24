import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  resetPwaInstallRuntime,
  startPwaInstallRuntime,
  usePwaInstall,
} from '@/shared/hooks/usePwaInstall';
import type { BeforeInstallPromptEvent } from '@/shared/pwa/pwaInstall';

function stubUserAgent(userAgent: string): () => void {
  const original = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent });
  return () => {
    if (original) Object.defineProperty(navigator, 'userAgent', original);
    else delete (navigator as { userAgent?: string }).userAgent;
  };
}

function stubStandaloneMatchMedia(standalone: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: standalone && query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function dispatchBeforeInstallPrompt(
  outcome: 'accepted' | 'dismissed' = 'accepted'
): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt', {
    cancelable: true,
  }) as BeforeInstallPromptEvent;
  Object.assign(event, {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  });
  window.dispatchEvent(event);
  return event;
}

afterEach(() => {
  resetPwaInstallRuntime();
  vi.unstubAllGlobals();
});

describe('usePwaInstall', () => {
  it('propose le guide générique dans un navigateur desktop sans prompt', () => {
    stubStandaloneMatchMedia(false);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.shouldShow).toBe(true);
    expect(result.current.mode).toBe('generic');
  });

  it('masque le bouton quand l’app tourne en standalone', () => {
    stubStandaloneMatchMedia(true);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.shouldShow).toBe(false);
    expect(result.current.mode).toBeNull();
  });

  it('passe en mode native après beforeinstallprompt et déclenche le prompt', async () => {
    stubStandaloneMatchMedia(false);
    const { result } = renderHook(() => usePwaInstall());
    const event = dispatchBeforeInstallPrompt('accepted');

    await waitFor(() => expect(result.current.mode).toBe('native'));

    let outcome: 'accepted' | 'dismissed' | 'unavailable' = 'unavailable';
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('accepted');
    await waitFor(() => expect(result.current.mode).toBe('generic'));
  });

  it('ouvre le mode in_app dans Instagram même si un prompt existe', async () => {
    stubStandaloneMatchMedia(false);
    const restoreUa = stubUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 302.0.0.23.114'
    );
    try {
      const { result } = renderHook(() => usePwaInstall());
      dispatchBeforeInstallPrompt();

      await waitFor(() => expect(result.current.mode).toBe('in_app'));
    } finally {
      restoreUa();
    }
  });

  it('utilise le guide iOS sur iPhone Safari', () => {
    stubStandaloneMatchMedia(false);
    const restoreUa = stubUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    );
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'iPhone' });
    try {
      const { result } = renderHook(() => usePwaInstall());
      expect(result.current.mode).toBe('ios');
    } finally {
      restoreUa();
      if (originalPlatform) Object.defineProperty(navigator, 'platform', originalPlatform);
    }
  });

  it('conserve un beforeinstallprompt émis avant le montage du hook', async () => {
    stubStandaloneMatchMedia(false);
    resetPwaInstallRuntime();
    startPwaInstallRuntime();
    dispatchBeforeInstallPrompt('accepted');

    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => expect(result.current.mode).toBe('native'));
  });

  it('masque le bouton après appinstalled', async () => {
    stubStandaloneMatchMedia(false);
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.shouldShow).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });
});
