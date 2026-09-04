import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTablistKeyboard } from './useTablistKeyboard';

const TABS = ['active', 'history'] as const;

function fakeKeyEvent(key: string) {
  return { key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLElement>;
}

describe('useTablistKeyboard', () => {
  it('moves to the next tab on ArrowRight and wraps around', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ active }) => useTablistKeyboard(TABS, active, onChange),
      { initialProps: { active: 'active' as (typeof TABS)[number] } }
    );

    result.current.onKeyDown(fakeKeyEvent('ArrowRight'));
    expect(onChange).toHaveBeenCalledWith('history');

    rerender({ active: 'history' });
    result.current.onKeyDown(fakeKeyEvent('ArrowRight'));
    expect(onChange).toHaveBeenCalledWith('active');
  });

  it('moves to the previous tab on ArrowLeft and wraps around', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTablistKeyboard(TABS, 'active', onChange));

    result.current.onKeyDown(fakeKeyEvent('ArrowLeft'));
    expect(onChange).toHaveBeenCalledWith('history');
  });

  it('jumps to the first tab on Home and the last on End', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTablistKeyboard(TABS, 'history', onChange));

    result.current.onKeyDown(fakeKeyEvent('Home'));
    expect(onChange).toHaveBeenCalledWith('active');

    result.current.onKeyDown(fakeKeyEvent('End'));
    expect(onChange).toHaveBeenCalledWith('history');
  });

  it('ignores unrelated keys', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTablistKeyboard(TABS, 'active', onChange));

    result.current.onKeyDown(fakeKeyEvent('Enter'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('gives roving tabindex only to the active tab', () => {
    const { result } = renderHook(() => useTablistKeyboard(TABS, 'active', vi.fn()));

    expect(result.current.tabIndexFor('active')).toBe(0);
    expect(result.current.tabIndexFor('history')).toBe(-1);
  });
});
