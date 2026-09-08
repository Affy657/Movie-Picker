import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider, useLocale, preferredLocale } from './LocaleContext';
import { useTranslation } from './useTranslation';

function Wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

beforeEach(() => {
  localStorage.setItem('moviepicker-locale', 'fr');
});

describe('useTranslation', () => {
  it('returns FR translation by default', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper: Wrapper });
    expect(result.current.t('common.loading')).toBe('Chargement\u2026');
    expect(result.current.locale).toBe('fr');
  });

  it('returns EN translation after locale switch', () => {
    const { result } = renderHook(
      () => {
        const translation = useTranslation();
        const localeCtx = useLocale();
        return { ...translation, setLocale: localeCtx.setLocale };
      },
      { wrapper: Wrapper }
    );

    act(() => result.current.setLocale('en'));

    expect(result.current.t('common.loading')).toBe('Loading\u2026');
    expect(result.current.locale).toBe('en');
  });

  it('persists locale preference in localStorage', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: Wrapper });
    act(() => result.current.setLocale('en'));
    expect(localStorage.getItem('moviepicker-locale')).toBe('en');
  });

  it('exposes tmdbLanguage aligned with locale', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: Wrapper });
    expect(result.current.tmdbLanguage).toBe('fr-FR');

    act(() => result.current.setLocale('en'));
    expect(result.current.tmdbLanguage).toBe('en-US');
  });

  it('reads stored locale from localStorage on mount', () => {
    localStorage.setItem('moviepicker-locale', 'en');
    const { result } = renderHook(() => useTranslation(), { wrapper: Wrapper });
    expect(result.current.locale).toBe('en');
    expect(result.current.t('common.loading')).toBe('Loading\u2026');
  });

  it('falls back to browser detection when localStorage holds an invalid value', () => {
    localStorage.setItem('moviepicker-locale', 'zz');
    const { result } = renderHook(() => useLocale(), { wrapper: Wrapper });
    expect(result.current.locale === 'fr' || result.current.locale === 'en').toBe(true);
  });

  it('falls back to browser detection when localStorage is empty', () => {
    localStorage.removeItem('moviepicker-locale');
    const { result } = renderHook(() => useLocale(), { wrapper: Wrapper });
    expect(result.current.locale === 'fr' || result.current.locale === 'en').toBe(true);
  });

  it('charge la langue a la demande quand le registre est vierge', async () => {
    vi.resetModules();
    localStorage.setItem('moviepicker-locale', 'en');
    const { LocaleProvider: FreshProvider } = await import('./LocaleContext');
    const { useTranslation: freshUseTranslation } = await import('./useTranslation');

    const { result } = renderHook(() => freshUseTranslation(), {
      wrapper: ({ children }: { children: ReactNode }) => <FreshProvider>{children}</FreshProvider>,
    });

    await waitFor(() => expect(result.current.t('common.loading')).toBe('Loading\u2026'));
  });

  it('detecte la langue du navigateur quand rien n est stocke', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'language');
    localStorage.removeItem('moviepicker-locale');

    Object.defineProperty(navigator, 'language', { value: 'en-GB', configurable: true });
    expect(preferredLocale()).toBe('en');

    Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });
    expect(preferredLocale()).toBe('fr');

    if (original) Object.defineProperty(navigator, 'language', original);
  });
});
