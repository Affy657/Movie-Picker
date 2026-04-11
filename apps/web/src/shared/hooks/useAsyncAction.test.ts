import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { ApiError } from '@/shared/api/apiError';

describe('useAsyncAction', () => {
  it('gère le cycle loading → résultat', async () => {
    const action = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useAsyncAction(action));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    let returned: unknown;
    await act(async () => {
      returned = await result.current.run();
    });

    expect(returned).toBe('ok');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("capture les erreurs ApiError et expose le message", async () => {
    const action = vi.fn().mockRejectedValue(new ApiError('Interdit', { code: 403 }));
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.error).toBe('Interdit');
    expect(result.current.loading).toBe(false);
  });

  it("expose Error.message pour une erreur Error standard", async () => {
    const action = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAsyncAction(action, 'Erreur personnalisée'));

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.error).toBe('boom');
  });

  it("utilise le fallback pour une valeur non-Error (ex. string)", async () => {
    const action = vi.fn().mockRejectedValue('crash brut');
    const { result } = renderHook(() => useAsyncAction(action, 'Erreur personnalisée'));

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.error).toBe('Erreur personnalisée');
  });

  it("clearError remet l'erreur à null", async () => {
    const action = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.error).toBeTruthy();

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("réinitialise l'erreur avant chaque exécution", async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.error).toBe('first');

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.error).toBeNull();
  });
});
