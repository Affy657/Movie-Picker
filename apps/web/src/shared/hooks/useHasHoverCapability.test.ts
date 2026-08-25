import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';

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

describe('useHasHoverCapability', () => {
  it('returns true when the media query matches', () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useHasHoverCapability());

    expect(result.current).toBe(true);
  });

  it('returns false when the media query does not match', () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useHasHoverCapability());

    expect(result.current).toBe(false);
  });

  it('subscribes to media query changes and unsubscribes on unmount', () => {
    const { addEventListener, removeEventListener } = stubMatchMedia(false);

    const { unmount } = renderHook(() => useHasHoverCapability());

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
