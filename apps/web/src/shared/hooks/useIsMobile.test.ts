import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

function stubMatchMedia(matches: boolean) {
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches, media: query, addEventListener, removeEventListener }))
  );
  return { addEventListener, removeEventListener };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIsMobile', () => {
  it('returns true when the media query matches', () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('returns false when the media query does not match', () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('subscribes to media query changes and unsubscribes on unmount', () => {
    const { addEventListener, removeEventListener } = stubMatchMedia(false);

    const { unmount } = renderHook(() => useIsMobile());

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
