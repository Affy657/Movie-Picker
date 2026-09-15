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

  it('stays closed when the last seen version matches the current version', () => {
    localStorage.setItem(KEY, LATEST_WHATS_NEW_RELEASE.version);
    const { result } = renderHook(() => useWhatsNew(USER_ID));
    expect(result.current.isOpen).toBe(false);
  });

  it('opens automatically when the seen version differs from the current version', () => {
    localStorage.setItem(KEY, '1.0.0');
    const { result } = renderHook(() => useWhatsNew(USER_ID));
    expect(result.current.isOpen).toBe(true);
  });

  it('recomputes the state at opening when userId changes', () => {
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
    it('reopens the modal even when the current version was already seen', () => {
      localStorage.setItem(KEY, LATEST_WHATS_NEW_RELEASE.version);
      const { result } = renderHook(() => useWhatsNew(USER_ID));
      expect(result.current.isOpen).toBe(false);
      act(() => result.current.openOnDemand());
      expect(result.current.isOpen).toBe(true);
    });
  });

  it('always exposes the latest curated version', () => {
    const { result } = renderHook(() => useWhatsNew(USER_ID));
    expect(result.current.release).toBe(LATEST_WHATS_NEW_RELEASE);
  });

  it('does not crash and stays closed in the same session when localStorage.setItem fails', () => {
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
