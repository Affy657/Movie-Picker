import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { apiErrorJson } from '@/mocks/apiJson';
import {
  createMyProposedMoviesHandlers,
  createWatchlistHandlers,
  TEST_API_V1,
  type MockProposedMovie,
} from '@/mocks/handlers';
import MyProposalsPage from './MyProposalsPage';

const authedUser = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
    ratingScale: 'ten',
    handle: 'alice',
  })
);

const PROPOSED: MockProposedMovie[] = [
  {
    tmdbId: 1,
    title: 'Midsommar',
    year: '2019',
    proposalCount: 2,
    lastProposedAt: '2026-11-10T20:00:00Z',
  },
  { tmdbId: 2, title: 'Alien', year: '1979', lastProposedAt: '2026-11-01T20:00:00Z' },
  { tmdbId: 3, title: 'Brazil', year: '1985', lastProposedAt: '2026-10-01T20:00:00Z' },
];

const WINNING: MockProposedMovie[] = [
  { tmdbId: 2, title: 'Alien', year: '1979', lastProposedAt: '2026-11-01T20:00:00Z' },
];

const PROPOSALS_PATH = '/listes/propositions';
const WINNING_PATH = '/listes/propositions-gagnantes';

function renderAt(path: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={PROPOSALS_PATH} element={<MyProposalsPage />} />
          <Route path={WINNING_PATH} element={<MyProposalsPage winningOnly />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

async function titles(listName: string) {
  const grid = await screen.findByRole('list', { name: listName });
  return within(grid)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);
}

describe('MyProposalsPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows the films I proposed, latest first, under a link back to Mes listes', async () => {
    server.use(
      authedUser,
      ...createWatchlistHandlers([]),
      ...createMyProposedMoviesHandlers(PROPOSED, WINNING)
    );

    renderAt(PROPOSALS_PATH);

    expect(await screen.findByText('3 films, proposés 4 fois')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Films proposés' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes listes' })).toHaveAttribute('href', '/listes');
    expect(await titles('Mes films proposés')).toEqual(['Midsommar', 'Alien', 'Brazil']);
    expect(screen.getByText('2 fois')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajouter/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /retirer/i })).toBeNull();
  });

  it('sorts by proposal date, title and year', async () => {
    server.use(
      authedUser,
      ...createWatchlistHandlers([]),
      ...createMyProposedMoviesHandlers(PROPOSED, WINNING)
    );
    const user = userEvent.setup();
    renderAt(PROPOSALS_PATH);

    const sorts = await screen.findByRole('toolbar', { name: /trier par/i });
    expect(
      within(sorts)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Proposé le', 'Titre', 'Année']);

    await user.click(within(sorts).getByRole('button', { name: 'Titre' }));

    expect(await titles('Mes films proposés')).toEqual(['Alien', 'Brazil', 'Midsommar']);
  });

  it('shows only the proposals that won their night on the winning page', async () => {
    server.use(
      authedUser,
      ...createWatchlistHandlers([]),
      ...createMyProposedMoviesHandlers(PROPOSED, WINNING)
    );

    renderAt(WINNING_PATH);

    expect(await screen.findByText('1 film gagnant')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Propositions gagnantes' })
    ).toBeInTheDocument();
    expect(await titles('Mes propositions gagnantes')).toEqual(['Alien']);
  });

  it.each([
    {
      path: PROPOSALS_PATH,
      title: 'Aucun film proposé pour l’instant',
      message: 'Les films que vous proposez en soirée arrivent ici d’eux-mêmes.',
    },
    {
      path: WINNING_PATH,
      title: 'Aucune proposition gagnante pour l’instant',
      message: 'Quand un film que vous avez proposé gagne une soirée, il arrive ici.',
    },
  ])('says what will land on $path while it is empty', async ({ path, title, message }) => {
    server.use(authedUser, ...createWatchlistHandlers([]), ...createMyProposedMoviesHandlers());

    renderAt(path);

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('says when the proposed films do not load', async () => {
    server.use(
      authedUser,
      ...createWatchlistHandlers([]),
      http.get(`${TEST_API_V1}/users/me/proposed-movies`, () => apiErrorJson(500, 'internal_error'))
    );

    renderAt(PROPOSALS_PATH);

    expect(
      await screen.findByText('Impossible de charger vos films proposés.')
    ).toBeInTheDocument();
  });
});
