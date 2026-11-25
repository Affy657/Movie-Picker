import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { holdPage, isPageHeld, onPageReleased, useHoldPage } from '@/shared/pwa/pageHold';

describe('pageHold', () => {
  const releases: (() => void)[] = [];

  afterEach(() => {
    releases.splice(0).forEach((release) => release());
  });

  function hold(): () => void {
    const release = holdPage();
    releases.push(release);
    return release;
  }

  it('holds the page until every holder has let go', () => {
    const first = hold();
    const second = hold();

    first();
    expect(isPageHeld()).toBe(true);

    second();
    expect(isPageHeld()).toBe(false);
  });

  it('counts a holder that lets go twice only once', () => {
    const first = hold();
    hold();

    first();
    first();

    expect(isPageHeld()).toBe(true);
  });

  it('tells its listeners when the last holder lets go, until they stop listening', () => {
    const listener = vi.fn();
    const stopListening = onPageReleased(listener);
    const first = hold();
    const second = hold();

    first();
    expect(listener).not.toHaveBeenCalled();
    second();
    expect(listener).toHaveBeenCalledTimes(1);

    stopListening();
    hold()();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('holds the page while a component asks for it, and lets go when it no longer does', () => {
    const { rerender, unmount } = renderHook(({ active }) => useHoldPage(active), {
      initialProps: { active: true },
    });
    expect(isPageHeld()).toBe(true);

    rerender({ active: false });
    expect(isPageHeld()).toBe(false);

    rerender({ active: true });
    unmount();
    expect(isPageHeld()).toBe(false);
  });
});
