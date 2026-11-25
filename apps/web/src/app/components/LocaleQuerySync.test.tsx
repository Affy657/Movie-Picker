import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocaleProvider, useLocale, type LocaleCode } from '@/shared/i18n';
import LocaleQuerySync from './LocaleQuerySync';

let switchLocale: (code: LocaleCode) => void = () => {};

function LocaleSwitch() {
  switchLocale = useLocale().setLocale;
  return null;
}

function renderSync(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <LocaleQuerySync />
        <LocaleSwitch />
      </LocaleProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.setItem('moviepicker-locale', 'fr');
});

describe('LocaleQuerySync', () => {
  it('leaves the cached answers alone while the language stays the same', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    renderSync(queryClient);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('asks every cached answer again once the interface changes language', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['movies', 'showcase'], { title: 'Le Voyage de Chihiro' });
    renderSync(queryClient);

    act(() => switchLocale('en'));

    expect(queryClient.getQueryState(['movies', 'showcase'])?.isInvalidated).toBe(true);
  });
});
