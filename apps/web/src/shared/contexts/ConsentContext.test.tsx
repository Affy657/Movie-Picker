import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ConsentProvider, useConsent } from '@/shared/contexts/ConsentContext';

const KEY = 'moviepicker-consent';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ConsentProvider>{children}</ConsentProvider>
);
const mount = () => renderHook(() => useConsent(), { wrapper });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useConsent', () => {
  it('throws when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useConsent())).toThrow(/ConsentProvider/);

    spy.mockRestore();
  });
});

describe('ConsentProvider initial state', () => {
  it('defaults to undecided when storage is empty', () => {
    const { result } = mount();

    expect(result.current.decided).toBe(false);
    expect(result.current.analytics).toBe(false);
  });

  it('reads a valid stored preference', () => {
    localStorage.setItem(KEY, JSON.stringify({ decided: true, analytics: true }));

    const { result } = mount();

    expect(result.current.decided).toBe(true);
    expect(result.current.analytics).toBe(true);
  });

  it('falls back to default on invalid JSON', () => {
    localStorage.setItem(KEY, 'not-json{{{');

    const { result } = mount();

    expect(result.current.decided).toBe(false);
  });

  it('falls back to default when stored shape is wrong', () => {
    localStorage.setItem(KEY, JSON.stringify({ decided: 'yes', analytics: 1 }));

    const { result } = mount();

    expect(result.current.decided).toBe(false);
    expect(result.current.analytics).toBe(false);
  });
});

describe('ConsentProvider actions', () => {
  it('acceptAll grants analytics and persists', () => {
    const { result } = mount();

    act(() => result.current.acceptAll());

    expect(result.current).toMatchObject({ decided: true, analytics: true });
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({
      decided: true,
      analytics: true,
    });
  });

  it('rejectAll decides without analytics', () => {
    const { result } = mount();

    act(() => result.current.rejectAll());

    expect(result.current).toMatchObject({ decided: true, analytics: false });
  });

  it('savePreferences stores the chosen analytics flag', () => {
    const { result } = mount();

    act(() => result.current.savePreferences({ analytics: true }));

    expect(result.current).toMatchObject({ decided: true, analytics: true });
  });

  it('reset clears the decision and the stored value', () => {
    const { result } = mount();

    act(() => result.current.acceptAll());
    act(() => result.current.reset());

    expect(result.current.decided).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
