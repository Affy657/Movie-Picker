import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('lea', 300));

    expect(result.current).toBe('lea');
  });

  it('keeps the previous value until the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'lea' },
    });

    rerender({ value: 'leandre' });
    expect(result.current).toBe('lea');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('lea');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('leandre');
  });

  it('only emits the last value of a burst of changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'l' },
    });

    rerender({ value: 'le' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: 'lea' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('l');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('lea');
  });

  it('clears its pending timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'lea' },
    });

    rerender({ value: 'leandre' });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
