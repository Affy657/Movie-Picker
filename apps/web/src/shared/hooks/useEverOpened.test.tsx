import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEverOpened } from '@/shared/hooks/useEverOpened';

describe('useEverOpened', () => {
  it('reste faux tant que la fenêtre ne s’est jamais ouverte', () => {
    const { result, rerender } = renderHook(({ open }) => useEverOpened(open), {
      initialProps: { open: false },
    });

    expect(result.current).toBe(false);
    rerender({ open: false });
    expect(result.current).toBe(false);
  });

  it('devient vrai à la première ouverture et le reste après fermeture', () => {
    const { result, rerender } = renderHook(({ open }) => useEverOpened(open), {
      initialProps: { open: false },
    });

    rerender({ open: true });
    expect(result.current).toBe(true);
    rerender({ open: false });
    expect(result.current).toBe(true);
  });

  it('est vrai dès le premier rendu si la fenêtre s’ouvre d’emblée', () => {
    const { result } = renderHook(() => useEverOpened(true));

    expect(result.current).toBe(true);
  });
});
