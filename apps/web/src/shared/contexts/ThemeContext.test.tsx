import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ThemeProvider, useTheme } from '@/shared/contexts/ThemeContext';
import { getNextUiPreference } from '@/shared/utils/uiThemePreference';

const PREF_KEY = 'moviepicker-ui-preference';
const LEGACY_KEY = 'moviepicker-theme';
const ACCENT_KEY = 'moviepicker-ui-accent';

const stubMatchMedia = (matches: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);
const mount = () => renderHook(() => useTheme(), { wrapper });

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.accent;
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useTheme', () => {
  it('throws when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);

    spy.mockRestore();
  });
});

describe('ThemeProvider initial state', () => {
  it('defaults to system preference and light resolved theme', () => {
    const { result } = mount();

    expect(result.current.preference).toBe('system');
    expect(result.current.accent).toBe('default');
    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('reads a stored preference and accent', () => {
    localStorage.setItem(PREF_KEY, 'dark');
    localStorage.setItem(ACCENT_KEY, 'blue');

    const { result } = mount();

    expect(result.current.preference).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.accent).toBe('blue');
    expect(document.documentElement.dataset.accent).toBe('blue');
  });

  it('migrates the legacy theme key', () => {
    localStorage.setItem(LEGACY_KEY, 'dark');

    const { result } = mount();

    expect(result.current.preference).toBe('dark');
    expect(localStorage.getItem(PREF_KEY)).toBe('dark');
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('resolves system preference to dark when the OS is dark', () => {
    stubMatchMedia(true);

    const { result } = mount();

    expect(result.current.preference).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
  });
});

describe('ThemeProvider actions', () => {
  it('setUiPreference updates state, storage and the dom dataset', () => {
    const { result } = mount();

    act(() => result.current.setUiPreference('light'));

    expect(result.current.preference).toBe('light');
    expect(localStorage.getItem(PREF_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('toggleTheme advances to the next preference', () => {
    const { result } = mount();

    act(() => result.current.toggleTheme());

    expect(result.current.preference).toBe(getNextUiPreference('system'));
  });

  it('setAccent sets the dataset and removing it for default', () => {
    const { result } = mount();

    act(() => result.current.setAccent('purple'));
    expect(document.documentElement.dataset.accent).toBe('purple');

    act(() => result.current.setAccent('default'));
    expect(document.documentElement.dataset.accent).toBeUndefined();
  });

  it('applyRemoteAccent applies a different accent', () => {
    const { result } = mount();

    act(() => result.current.applyRemoteAccent('green'));

    expect(result.current.accent).toBe('green');
    expect(localStorage.getItem(ACCENT_KEY)).toBe('green');
  });
});
