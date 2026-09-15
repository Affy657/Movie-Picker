import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEverOpened } from '@/shared/hooks/useEverOpened';

describe('useEverOpened', () => {
  it('stays false as long as the window never opened', () => {
    const { result, rerender } = renderHook(({ open }) => useEverOpened(open), {
      initialProps: { open: false },
    });

    expect(result.current).toBe(false);
    rerender({ open: false });
    expect(result.current).toBe(false);
  });

  it('turns true at the first opening and stays so after closing', () => {
    const { result, rerender } = renderHook(({ open }) => useEverOpened(open), {
      initialProps: { open: false },
    });

    rerender({ open: true });
    expect(result.current).toBe(true);
    rerender({ open: false });
    expect(result.current).toBe(true);
  });

  it('is true from the first render when the window opens straight away', () => {
    const { result } = renderHook(() => useEverOpened(true));

    expect(result.current).toBe(true);
  });
});
