import type { ReactNode } from 'react';
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { apiJson } from '@/mocks/apiJson';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import { setHomeSearchHidden } from '@/app/pages/home/homeSearchVisibility';
import HeaderSearch from './HeaderSearch';

const server = setupServer(
  authMeGuestHandler,
  http.get(`${TEST_API_V1}/search`, () =>
    apiJson<'GlobalSearchResponse'>({
      titles: [
        { tmdbId: 438631, mediaType: 'movie', title: 'Dune', year: '2021', posterPath: null },
      ],
      sagas: [],
      groups: [],
      lists: [],
      publicLists: [],
      members: [],
      nights: [
        {
          slug: 'dune-night',
          title: 'Nuit Dune',
          date: '2035-11-20',
          time: '20:30',
          isFinished: false,
        },
      ],
    })
  )
);

beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
afterAll(() => server.close());

function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return <AppTestProviders>{children}</AppTestProviders>;
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderHeaderSearch(path = '/') {
  return render(
    <Providers>
      <MemoryRouter initialEntries={[path]}>
        <HeaderSearch />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </Providers>
  );
}

const loupe = () => screen.queryByRole('button', { name: 'Rechercher' });
const field = () =>
  screen.getByRole('searchbox', { name: 'Rechercher un film, une soirée, une liste ou un membre' });

describe('HeaderSearch', () => {
  afterEach(() => {
    act(() => setHomeSearchHidden(false));
    vi.unstubAllGlobals();
  });

  it.each([
    ['a phone', (query: string) => query.includes('max-width')],
    ['a computer', () => false],
  ])(
    'on %s, shows the loupe on Explorer only once the page search has scrolled away',
    (_, phone) => {
      stubMatchMedia(phone);
      renderHeaderSearch('/');

      expect(loupe()).not.toBeInTheDocument();
      act(() => setHomeSearchHidden(true));
      expect(loupe()).toBeInTheDocument();
      act(() => setHomeSearchHidden(false));
      expect(loupe()).not.toBeInTheDocument();
    }
  );

  it.each([
    ['a phone', (query: string) => query.includes('max-width')],
    ['a computer', () => false],
  ])('on %s, always shows the loupe on the other pages', (_, phone) => {
    stubMatchMedia(phone);
    renderHeaderSearch('/watchlist');

    expect(loupe()).toBeInTheDocument();
  });

  it('shows the results while typing and closes on the one opened', async () => {
    stubMatchMedia(false);
    renderHeaderSearch('/watchlist');

    await userEvent.click(loupe() as HTMLElement);
    await userEvent.keyboard('dune');
    await userEvent.click(await screen.findByRole('link', { name: /Nuit Dune/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/e/dune-night');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('moves between the field and the results with the arrow keys', async () => {
    stubMatchMedia(false);
    renderHeaderSearch('/watchlist');

    await userEvent.click(loupe() as HTMLElement);
    await userEvent.keyboard('dune');
    const first = await screen.findByRole('link', { name: /Dune 2021/ });

    await userEvent.keyboard('{ArrowDown}');
    expect(first).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'Voir tous les films et séries' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(field()).toHaveFocus();
  });

  it('closes when another page opens', async () => {
    stubMatchMedia(false);
    renderHeaderSearch('/watchlist');
    await userEvent.click(loupe() as HTMLElement);

    await userEvent.keyboard('Dune{Enter}');

    await waitFor(() => expect(screen.queryByRole('searchbox')).not.toBeInTheDocument());
  });

  it('opens the search with the field ready, without scrolling the page', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    renderHeaderSearch('/');
    act(() => setHomeSearchHidden(true));

    await userEvent.click(loupe() as HTMLElement);

    expect(field()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Dune' })).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('ties the loupe to the search panel it opens', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    renderHeaderSearch('/');
    act(() => setHomeSearchHidden(true));
    const button = loupe() as HTMLElement;
    expect(button).not.toHaveAttribute('aria-controls');

    await userEvent.click(button);

    const panel = screen.getByRole('search');
    expect(panel.id).not.toBe('');
    expect(button).toHaveAttribute('aria-controls', panel.id);
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

  it('closes when its loupe is pressed again', async () => {
    stubMatchMedia(false);
    renderHeaderSearch('/watchlist');

    await userEvent.click(loupe() as HTMLElement);
    expect(field()).toBeInTheDocument();
    await userEvent.click(loupe() as HTMLElement);

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('closes when the page search comes back into view, and stays closed', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    renderHeaderSearch('/');
    act(() => setHomeSearchHidden(true));
    await userEvent.click(loupe() as HTMLElement);

    act(() => setHomeSearchHidden(false));
    act(() => setHomeSearchHidden(true));

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('keeps the covered loupe out of the tab order while the search is open', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    render(
      <Providers>
        <MemoryRouter initialEntries={['/']}>
          <button type="button">Logo</button>
          <HeaderSearch />
        </MemoryRouter>
      </Providers>
    );
    act(() => setHomeSearchHidden(true));
    await userEvent.click(loupe() as HTMLElement);
    expect(field()).toHaveFocus();

    await userEvent.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Logo' })).toHaveFocus();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(loupe()).not.toHaveAttribute('tabindex');
  });

  it('closes when the focus leaves the search', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    render(
      <Providers>
        <MemoryRouter initialEntries={['/']}>
          <HeaderSearch />
          <button type="button">Ailleurs</button>
        </MemoryRouter>
      </Providers>
    );
    act(() => setHomeSearchHidden(true));
    await userEvent.click(loupe() as HTMLElement);

    act(() => screen.getByRole('button', { name: 'Ailleurs' }).focus());

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
