import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';

describe('useIdlePrefetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('lance les chargements au premier temps libre du fil principal, une seule fois', () => {
    vi.useFakeTimers();
    const callbacks: Array<() => void> = [];
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const load = vi.fn(() => Promise.resolve());

    const { rerender } = renderHook(() => useIdlePrefetch([load]));
    rerender();

    expect(load).not.toHaveBeenCalled();
    for (const callback of callbacks) callback();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('annule le rendez-vous si le composant disparaît avant', () => {
    const cancel = vi.fn();
    vi.stubGlobal('requestIdleCallback', () => 7);
    vi.stubGlobal('cancelIdleCallback', cancel);

    const { unmount } = renderHook(() => useIdlePrefetch([() => Promise.resolve()]));
    unmount();

    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('se rabat sur un délai quand requestIdleCallback manque', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    const load = vi.fn(() => Promise.resolve());

    renderHook(() => useIdlePrefetch([load]));
    vi.runAllTimers();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('ignore un chargement qui échoue', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const failing = vi.fn(() => Promise.reject(new Error('réseau')));

    renderHook(() => useIdlePrefetch([failing]));
    await vi.runAllTimersAsync();

    expect(failing).toHaveBeenCalledTimes(1);
  });
});
