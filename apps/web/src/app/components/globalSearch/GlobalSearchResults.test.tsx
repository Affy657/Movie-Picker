import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { apiErrorJson, apiJson, type ApiSchemas } from '@/mocks/apiJson';
import GlobalSearchResults from './GlobalSearchResults';

type SearchPayload = ApiSchemas['GlobalSearchResponse'];

const EMPTY: SearchPayload = {
  titles: [],
  sagas: [],
  members: [],
  nights: [],
  groups: [],
  lists: [],
  publicLists: [],
};

const FULL: SearchPayload = {
  sagas: [{ id: 10, name: 'Dune, la saga', posterPath: null, movieCount: 3 }],
  groups: [{ id: 'g1', name: 'Dune club', memberCount: 4 }],
  lists: [{ id: 'l1', name: 'Dune et compagnie', itemCount: 1, posterPath: null }],
  publicLists: [
    {
      id: 'p1',
      name: 'Toute la SF de Dune',
      itemCount: 12,
      posterPath: null,
      ownerHandle: 'alice_m',
      ownerDisplayName: 'Alice Martin',
    },
  ],
  titles: [
    { tmdbId: 438631, mediaType: 'movie', title: 'Dune', year: '2021', posterPath: null },
    { tmdbId: 90228, mediaType: 'tv', title: 'Dune : Prophecy', year: '2024', posterPath: null },
  ],
  members: [
    { handle: 'dune_fan', displayName: 'Paul Atréides', avatarId: '🎬', isFollowedByMe: false },
  ],
  nights: [
    {
      slug: 'dune-night',
      title: 'Nuit Dune',
      date: '2035-11-20',
      time: '20:30',
      isFinished: false,
    },
    {
      slug: 'dune-old',
      title: 'Dune, la première',
      date: '2025-03-01',
      time: '21:00',
      isFinished: true,
    },
  ],
};

const queries: string[] = [];

function searchReturns(payload: SearchPayload) {
  return http.get(`${TEST_API_V1}/search`, ({ request }) => {
    queries.push(new URL(request.url).searchParams.get('q') ?? '');
    return apiJson<'GlobalSearchResponse'>(payload);
  });
}

const server = setupServer(authMeGuestHandler, searchReturns(FULL));

beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  queries.length = 0;
});
afterAll(() => server.close());

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderResults(term: string, onPick = vi.fn()) {
  render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/']}>
        <GlobalSearchResults term={term} source="header" onPick={onPick} />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
  return onPick;
}

describe('GlobalSearchResults', () => {
  it('shows nothing and asks nothing below two letters', async () => {
    renderResults(' d ');

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(queries).toEqual([]);
  });

  it('ranges the results by type, each one leading to its page', async () => {
    renderResults('dune');

    const titles = await screen.findByRole('region', { name: 'Films et séries' });
    expect(within(titles).getByRole('link', { name: /Dune 2021/ })).toHaveAttribute(
      'href',
      '/film/438631-dune'
    );
    const show = within(titles).getByRole('link', { name: /Dune : Prophecy/ });
    expect(show).toHaveAttribute('href', '/serie/90228-dune-prophecy');
    expect(show).toHaveTextContent('Série');

    const nights = screen.getByRole('region', { name: 'Mes soirées' });
    expect(within(nights).getByRole('link', { name: /Nuit Dune/ })).toHaveAttribute(
      'href',
      '/e/dune-night'
    );
    expect(within(nights).getByRole('link', { name: /Dune, la première/ })).toHaveTextContent(
      'Terminée'
    );

    const members = screen.getByRole('region', { name: 'Membres' });
    const member = within(members).getByRole('link', { name: /Paul Atréides/ });
    expect(member).toHaveAttribute('href', '/u/dune_fan');
    expect(member).toHaveTextContent('@dune_fan');
    expect(queries).toEqual(['dune']);
  });

  it('finds sagas, groups, lists and the public lists of members', async () => {
    renderResults('dune');

    const saga = await screen.findByRole('link', { name: /Dune, la saga/ });
    expect(saga).toHaveAttribute('href', '/films/collection/10');
    expect(saga).toHaveTextContent('3 films');
    const group = within(screen.getByRole('region', { name: 'Mes groupes' })).getByRole('link');
    expect(group).toHaveAttribute('href', '/groupes/g1');
    expect(group).toHaveTextContent('4 membres');
    const list = within(screen.getByRole('region', { name: 'Mes listes' })).getByRole('link');
    expect(list).toHaveAttribute('href', '/listes/l1');
    expect(list).toHaveTextContent('1 film');
    const shared = within(screen.getByRole('region', { name: 'Listes des membres' })).getByRole(
      'link'
    );
    expect(shared).toHaveAttribute('href', '/u/alice_m/listes/p1');
    expect(shared).toHaveTextContent('par Alice Martin');
    expect(screen.getByRole('region', { name: 'Sagas' })).toBeInTheDocument();
  });

  it('offers every film and show for the typed words', async () => {
    renderResults('dune');

    const seeAll = await screen.findByRole('link', { name: 'Voir tous les films et séries' });

    expect(seeAll).toHaveAttribute('href', '/films/recherche?q=dune');
  });

  it('leaves out the sections that found nothing', async () => {
    server.use(searchReturns({ ...EMPTY, titles: FULL.titles }));
    renderResults('dune');

    await screen.findByRole('region', { name: 'Films et séries' });
    expect(screen.queryByRole('region', { name: 'Mes soirées' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Membres' })).not.toBeInTheDocument();
  });

  it('says when nothing matches and still leads to the film search', async () => {
    server.use(searchReturns(EMPTY));
    renderResults('zzzz');

    expect(await screen.findByText('Rien ne correspond à « zzzz ».')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chercher parmi tous les films' })).toHaveAttribute(
      'href',
      '/films/recherche?q=zzzz'
    );
  });

  it('lets the search be tried again when it fails', async () => {
    server.use(http.get(`${TEST_API_V1}/search`, () => apiErrorJson(500, 'boom')));
    renderResults('dune');

    await userEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
    server.use(searchReturns(FULL));
    await userEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('region', { name: 'Films et séries' })).toBeInTheDocument();
  });

  it('announces how many results it found', async () => {
    renderResults('dune');

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('9 résultats'));
  });

  it('tells which kind of result was opened', async () => {
    const onPick = renderResults('dune');

    await userEvent.click(await screen.findByRole('link', { name: /Nuit Dune/ }));

    expect(onPick).toHaveBeenCalledWith('night');
    expect(screen.getByTestId('location')).toHaveTextContent('/e/dune-night');
  });
});
