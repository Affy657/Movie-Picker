import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import { setHomeSearchHidden } from '@/app/pages/home/homeSearchVisibility';
import HeaderSearch from './HeaderSearch';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderHeaderSearch(path = '/') {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <HeaderSearch />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>
  );
}

const loupe = () => screen.queryByRole('button', { name: 'Chercher un film' });

describe('HeaderSearch', () => {
  afterEach(() => {
    act(() => setHomeSearchHidden(false));
    vi.unstubAllGlobals();
  });

  it('on a phone, shows the loupe on Explorer only once the page search has scrolled away', () => {
    stubMatchMedia((query) => query.includes('max-width'));
    renderHeaderSearch('/');

    expect(loupe()).not.toBeInTheDocument();
    act(() => setHomeSearchHidden(true));
    expect(loupe()).toBeInTheDocument();
    act(() => setHomeSearchHidden(false));
    expect(loupe()).not.toBeInTheDocument();
  });

  it('never shows the loupe on a computer', () => {
    stubMatchMedia(false);
    renderHeaderSearch('/');

    act(() => setHomeSearchHidden(true));
    expect(loupe()).not.toBeInTheDocument();
  });

  it('never shows the loupe on another page', () => {
    stubMatchMedia((query) => query.includes('max-width'));
    renderHeaderSearch('/watchlist');

    act(() => setHomeSearchHidden(true));
    expect(loupe()).not.toBeInTheDocument();
  });

  it('opens the search with the field ready, without scrolling the page', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    renderHeaderSearch('/');
    act(() => setHomeSearchHidden(true));

    await userEvent.click(loupe() as HTMLElement);

    expect(screen.getByRole('searchbox', { name: 'Chercher un film' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Dune' })).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leads a typed search to the results page', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    renderHeaderSearch('/');
    act(() => setHomeSearchHidden(true));

    await userEvent.click(loupe() as HTMLElement);
    await userEvent.keyboard('Dune{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/films/recherche?q=Dune');
  });

  it('closes with its button or Escape and gives the loupe back', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    renderHeaderSearch('/');
    act(() => setHomeSearchHidden(true));

    await userEvent.click(loupe() as HTMLElement);
    await userEvent.click(screen.getByRole('button', { name: 'Fermer la recherche' }));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(loupe()).toHaveFocus();

    await userEvent.click(loupe() as HTMLElement);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
