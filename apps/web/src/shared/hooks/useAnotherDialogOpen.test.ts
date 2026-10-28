import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAnotherDialogOpen } from './useAnotherDialogOpen';

function dialog(open = false): HTMLDialogElement {
  const element = document.createElement('dialog');
  if (open) element.setAttribute('open', '');
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useAnotherDialogOpen', () => {
  it('ignores its own dialog', () => {
    const own = dialog(true);

    const { result } = renderHook(() => useAnotherDialogOpen({ current: own }));

    expect(result.current).toBe(false);
  });

  it('notices another dialog opening, then closing', async () => {
    const own = dialog();
    const other = dialog();
    const { result } = renderHook(() => useAnotherDialogOpen({ current: own }));

    act(() => other.setAttribute('open', ''));
    await waitFor(() => expect(result.current).toBe(true));

    act(() => other.removeAttribute('open'));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('notices a dialog already open when it starts watching', () => {
    dialog(true);

    const { result } = renderHook(() => useAnotherDialogOpen({ current: null }));

    expect(result.current).toBe(true);
  });

  it('forgets a dialog removed from the page while open', async () => {
    const other = dialog(true);
    const { result } = renderHook(() => useAnotherDialogOpen({ current: null }));
    expect(result.current).toBe(true);

    act(() => other.remove());

    await waitFor(() => expect(result.current).toBe(false));
  });
});
