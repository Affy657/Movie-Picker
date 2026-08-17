import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWhatsNew } from './useWhatsNew';
import { LATEST_WHATS_NEW_RELEASE } from '@/shared/whatsNew';

const USER_ID = 'user-123';
const KEY = `moviepicker_whats_new_seen_${USER_ID}`;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useWhatsNew', () => {
  it('ne s’ouvre jamais si userId est undefined', () => {
    const { result } = renderHook(() => useWhatsNew(undefined));
    expect(result.current.isOpen).toBe(false);
  });

  it('s’ouvre automatiquement si aucune version vue en localStorage', () => {
    const { result } = renderHook(() => useWhatsNew(USER_ID));
    expect(result.current.isOpen).toBe(true);
  });

  it('reste fermé si la dernière version vue correspond à la version courante', () => {
    localStorage.setItem(KEY, LATEST_WHATS_NEW_RELEASE.version);
    const { result } = renderHook(() => useWhatsNew(USER_ID));
    expect(result.current.isOpen).toBe(false);
  });

  it('s’ouvre automatiquement si la version vue est différente de la version courante', () => {
    localStorage.setItem(KEY, '1.0.0');
    const { result } = renderHook(() => useWhatsNew(USER_ID));
    expect(result.current.isOpen).toBe(true);
  });

  it('recalcule l’état à l’ouverture quand userId change', () => {
    localStorage.setItem(KEY, LATEST_WHATS_NEW_RELEASE.version);
    const { result, rerender } = renderHook(({ uid }) => useWhatsNew(uid), {
      initialProps: { uid: USER_ID as string | undefined },
    });
    expect(result.current.isOpen).toBe(false);
    rerender({ uid: 'user-456' });
    expect(result.current.isOpen).toBe(true);
  });

  describe('close', () => {
    it('ferme la modale et persiste la version courante', () => {
      const { result } = renderHook(() => useWhatsNew(USER_ID));
      expect(result.current.isOpen).toBe(true);
      act(() => result.current.close());
      expect(result.current.isOpen).toBe(false);
      expect(localStorage.getItem(KEY)).toBe(LATEST_WHATS_NEW_RELEASE.version);
    });

    it('ne persiste rien si userId est undefined', () => {
      const { result } = renderHook(() => useWhatsNew(undefined));
      act(() => result.current.close());
      expect(localStorage.getItem(KEY)).toBeNull();
    });
  });

  describe('openOnDemand', () => {
    it('rouvre la modale même si la version courante a déjà été vue', () => {
      localStorage.setItem(KEY, LATEST_WHATS_NEW_RELEASE.version);
      const { result } = renderHook(() => useWhatsNew(USER_ID));
      expect(result.current.isOpen).toBe(false);
      act(() => result.current.openOnDemand());
      expect(result.current.isOpen).toBe(true);
    });
  });

  it('expose toujours la dernière version curée', () => {
    const { result } = renderHook(() => useWhatsNew(USER_ID));
    expect(result.current.release).toBe(LATEST_WHATS_NEW_RELEASE);
  });

  it('ne plante pas et reste fermée dans la même session si localStorage.setItem échoue', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result, rerender } = renderHook(({ uid }) => useWhatsNew(uid), {
      initialProps: { uid: USER_ID as string | undefined },
    });
    expect(result.current.isOpen).toBe(true);
    expect(() => act(() => result.current.close())).not.toThrow();
    expect(result.current.isOpen).toBe(false);
    rerender({ uid: 'user-456' });
    rerender({ uid: USER_ID });
    expect(result.current.isOpen).toBe(false);
  });
});
