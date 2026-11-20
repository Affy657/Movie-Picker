import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { openSortMenu, sortChoices } from '@/test-utils/sortMenu';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import {
  createNightMoviesHandlers,
  createWatchlistHandlers,
  TEST_API_V1,
  type MockNightMovie,
} from '@/mocks/handlers';
import { apiErrorJson } from '@/mocks/apiJson';
import NightMoviesPage from './NightMoviesPage';

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

const NIGHT_MOVIES: MockNightMovie[] = [
  {
    tmdbId: 1,
    title: 'Dune',
    year: '2021',
    lastProposedAt: '2026-11-10T20:00:00Z',
    isWinner: true,
    lastProposer: { pseudo: 'Camille Durand', avatarId: 'fox', isMe: false },
  },
  {
    tmdbId: 2,
    title: 'Alien',
    year: '1979',
    lastProposedAt: '2026-11-01T20:00:00Z',
    proposedByMe: true,
    isWatched: true,
    lastProposer: { pseudo: 'Alice', avatarId: null, isMe: true },
  },
  {
    tmdbId: 3,
    title: 'Babylon',
    year: '2022',
    lastProposedAt: '2026-10-01T20:00:00Z',
    lastProposer: { pseudo: 'Tom', avatarId: null, isMe: false },
  },
];

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/listes/films-des-soirees']}>
        <Routes>
          <Route path="/listes/films-des-soirees" element={<NightMoviesPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

function useServer(films: MockNightMovie[] = NIGHT_MOVIES) {
  return [authedUser, ...createWatchlistHandlers([]), ...createNightMoviesHandlers(films)];
}

async function titles() {
  const grid = await screen.findByRole('list', { name: 'Films de mes soirées' });
  return within(grid)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);
}

describe('NightMoviesPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('lists the films of my nights, latest proposal first, under a link back to Mes listes', async () => {
    server.use(...useServer());

    renderPage();

    expect(await screen.findByText('3 films')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Films de mes soirées' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes listes' })).toHaveAttribute('href', '/listes');
    expect(
      screen.getByText('Tous les films proposés dans vos soirées, par vous comme par les autres.')
    ).toBeInTheDocument();
    expect(await titles()).toEqual(['Dune', 'Alien', 'Babylon']);
    expect(screen.queryByRole('button', { name: /ajouter/i })).toBeNull();
  });

  it('sorts by proposal date, title and year', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    const sorts = await openSortMenu(user, 'Proposé le');
    expect(sortChoices(sorts)).toEqual(['Proposé le', 'Titre', 'Année']);

    await user.click(within(sorts).getByRole('menuitemradio', { name: 'Année' }));

    expect(await titles()).toEqual(['Babylon', 'Dune', 'Alien']);
  });

  it('badges the winners and says who proposed each film', async () => {
    server.use(...useServer());

    renderPage();

    await screen.findByRole('list', { name: 'Films de mes soirées' });
    expect(screen.getAllByText('A gagné une de vos soirées')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Proposé par Camille' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Proposé par vous' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Proposé par Tom' })).toBeInTheDocument();
  });

  it('filters the winners and the films I proposed', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    const scope = await screen.findByRole('radiogroup', { name: 'Afficher' });
    expect(within(scope).getByRole('radio', { name: 'Tous' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(within(scope).getByRole('radio', { name: 'Gagnants' }));
    expect(await titles()).toEqual(['Dune']);
    expect(screen.getByText('1 sur 3')).toBeInTheDocument();

    await user.click(within(scope).getByRole('radio', { name: 'Proposés par moi' }));
    expect(await titles()).toEqual(['Alien']);
  });

  it('dims the films I already watched once Griser les vus is on', async () => {
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ userId: 'u1', displayName: 'Alice', dimWatched: true })
      ),
      ...useServer()
    );
    const user = userEvent.setup();
    renderPage();

    const dim = await screen.findByRole('switch', { name: 'Griser les vus' });
    expect(dim).toHaveAttribute('aria-checked', 'false');
    await user.click(dim);

    expect(
      await screen.findByRole('button', { name: 'Voir les détails de « Alien », déjà vu' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Voir les détails de « Dune »' })
    ).toBeInTheDocument();
  });

  it('explains the page and links to a new night when no film was proposed yet', async () => {
    server.use(...useServer([]));

    renderPage();

    expect(await screen.findByText('Aucun film proposé pour l’instant')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Les films proposés dans vos soirées arrivent ici d’eux-mêmes, quel que soit leur proposant.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer une soirée' })).toHaveAttribute('href', '/new');
  });

  it('says when the films could not load', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/me/night-movies`, () => apiErrorJson(500, 'internal_error')),
      ...useServer()
    );

    renderPage();

    expect(
      await screen.findByText('Impossible de charger les films de vos soirées.')
    ).toBeInTheDocument();
  });
});
