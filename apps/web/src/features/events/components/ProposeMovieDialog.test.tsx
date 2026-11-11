import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import type { MovieData } from '@/shared/types/movie';
import type { MovieSearchItem } from '@/features/movies/api/moviesApi';
import ProposeMovieDialog from '@/features/events/components/ProposeMovieDialog';

const api = vi.hoisted(() => ({
  searchMovies: vi.fn(),
  addMovieToEvent: vi.fn(),
  removeMovieFromEvent: vi.fn(),
  fetchMovieDetails: vi.fn(),
}));

vi.mock('@/features/movies/api/moviesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/movies/api/moviesApi')>()),
  ...api,
}));

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'u1', ratingScale: 'ten' }, isLoading: false }),
}));

vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

vi.mock('@/features/movies/hooks/useWatchlist', () => ({
  useWatchlist: () => ({
    data: [
      {
        tmdbId: 501,
        mediaType: 'movie',
        title: 'Past Lives',
        year: '2023',
        posterPath: null,
        voteAverage: 7.8,
        runtimeMinutes: 106,
        createdAt: '2026-11-01T10:00:00Z',
      },
      {
        tmdbId: 502,
        mediaType: 'movie',
        title: 'Aftersun',
        year: '2022',
        posterPath: null,
        voteAverage: 7.7,
        runtimeMinutes: 102,
        createdAt: '2026-10-01T10:00:00Z',
      },
    ],
  }),
  useWatchlistAvailability: () => ({
    data: {
      partial: false,
      items: [
        {
          tmdbId: 501,
          mediaType: 'movie',
          tmdbWatchPageUrl: null,
          watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
        },
        { tmdbId: 502, mediaType: 'movie', tmdbWatchPageUrl: null, watchProviders: [] },
      ],
    },
  }),
}));

const DUNE: MovieSearchItem = {
  id: 438631,
  mediaType: 'movie',
  title: 'Dune',
  year: '2021',
  posterPath: null,
  voteAverage: 7.8,
  runtimeMinutes: 155,
  watchProviders: [{ providerId: 1899, name: 'Max', logoPath: null, type: 'flatrate' }],
  tmdbWatchPageUrl: null,
};

const JAWS: MovieSearchItem = {
  id: 578,
  mediaType: 'movie',
  title: 'Les Dents de la mer',
  year: '1975',
  posterPath: null,
  voteAverage: 7.7,
  runtimeMinutes: 124,
  watchProviders: [],
  tmdbWatchPageUrl: null,
};

const MARLEY: MovieSearchItem = { ...JAWS, id: 14306, title: 'Marley & moi', year: '2008' };

function movie(overrides: Partial<MovieData>): MovieData {
  return {
    id: 'm-x',
    eventId: 'e1',
    participantId: 'p-lea',
    tmdbId: 0,
    mediaType: 'movie',
    title: '',
    year: '',
    posterPath: null,
    proposerPseudo: 'Léa',
    score: 0,
    up: 0,
    down: 0,
    myVote: null,
    ...overrides,
  };
}

const NIGHT_MOVIES: MovieData[] = [
  movie({ id: 'm-jaws', tmdbId: 578, title: 'Les Dents de la mer', proposerPseudo: 'Léa' }),
  movie({
    id: 'm-marley',
    tmdbId: 14306,
    title: 'Marley & moi',
    participantId: 'p-me',
    proposerPseudo: 'Sofia',
  }),
  movie({ id: 'm-lambs', tmdbId: 274, title: 'Le Silence des agneaux', proposerPseudo: 'Théo' }),
];

function searchResponse(items: MovieSearchItem[]) {
  return {
    items,
    watchProvidersRegion: 'FR',
    disclaimer: '',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  };
}

function renderDialog(overrides: Partial<Parameters<typeof ProposeMovieDialog>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    slug: 'cine-club',
    eventName: 'Ciné-club du mercredi',
    participant: { participantId: 'p-me', pseudo: 'Sofia' },
    movies: NIGHT_MOVIES,
    onChanged: vi.fn(),
    onVote: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <QueryClientWrapper>
        <LocaleProvider>
          <ProposeMovieDialog {...props} />
        </LocaleProvider>
      </QueryClientWrapper>
    </MemoryRouter>
  );
  return props;
}

async function search(user: ReturnType<typeof userEvent.setup>, term: string) {
  await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), term);
}

describe('ProposeMovieDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    api.searchMovies.mockReset();
    api.addMovieToEvent.mockReset();
    api.removeMovieFromEvent.mockReset();
    api.fetchMovieDetails.mockReset();
    api.addMovieToEvent.mockResolvedValue({ id: 'm-new' });
    api.removeMovieFromEvent.mockResolvedValue(undefined);
    api.searchMovies.mockImplementation((term: string) =>
      Promise.resolve(searchResponse(term.includes('dents') ? [JAWS, MARLEY] : [DUNE, MARLEY]))
    );
  });

  it('opens on the night it adds to, with how many movies are already in', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'Proposer un film' });
    expect(within(dialog).getByText('Ciné-club du mercredi')).toBeInTheDocument();
    expect(within(dialog).getByText('3 films proposés')).toBeInTheDocument();
  });

  it('lists my watchlist as rows before anything is typed, telling which ones stream', () => {
    renderDialog();

    const list = screen.getByRole('list', { name: 'Dans ma liste' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Past Lives');
    expect(rows[0]).toHaveTextContent('En streaming');
    expect(rows[1]).toHaveTextContent('Aftersun');
    expect(rows[1]).toHaveTextContent('Pas en streaming');
    expect(within(rows[0]!).getByRole('button', { name: 'Proposer « Past Lives »' })).toBeEnabled();
  });

  it('only keeps the streaming movies of my watchlist once that filter is on', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'En streaming' }));

    const rows = within(screen.getByRole('list', { name: 'Dans ma liste' })).getAllByRole(
      'listitem'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Past Lives');
    expect(api.searchMovies).not.toHaveBeenCalled();
  });

  it('proposes a movie in one click, keeps the results and counts it at the bottom', async () => {
    const user = userEvent.setup();
    const props = renderDialog();
    await search(user, 'dune');

    await user.click(await screen.findByRole('button', { name: 'Proposer « Dune »' }));

    await waitFor(() =>
      expect(api.addMovieToEvent).toHaveBeenCalledWith(
        'cine-club',
        expect.objectContaining({ tmdbId: 438631, title: 'Dune', participantId: 'p-me' })
      )
    );
    expect(props.onChanged).toHaveBeenCalled();
    const results = screen.getByRole('list', { name: 'Résultats de la recherche' });
    const row = within(results).getAllByRole('listitem')[0]!;
    expect(row).toHaveTextContent('Proposé');
    expect(screen.getByText('« Dune » est proposé à la soirée.').tagName).toBe('OUTPUT');
    expect(screen.getByText('Vous avez proposé 1 film')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminé' })).toBeInTheDocument();
  });

  it('takes a proposal back from the confirmation message', async () => {
    const user = userEvent.setup();
    const props = renderDialog();
    await search(user, 'dune');
    await user.click(await screen.findByRole('button', { name: 'Proposer « Dune »' }));

    await user.click(await screen.findByRole('button', { name: 'Annuler' }));

    await waitFor(() =>
      expect(api.removeMovieFromEvent).toHaveBeenCalledWith('cine-club', 'm-new', 'p-me')
    );
    expect(props.onChanged).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Vous avez proposé 1 film')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Proposer « Dune »' })).toBeEnabled();
  });

  it('says who already proposed a movie and offers to vote for it instead', async () => {
    const user = userEvent.setup();
    const props = renderDialog();
    await search(user, 'dents');

    const results = await screen.findByRole('list', { name: 'Résultats de la recherche' });
    const jaws = within(results).getAllByRole('listitem')[0]!;
    expect(jaws).toHaveTextContent('Proposé par Léa');
    expect(within(jaws).queryByRole('button', { name: /^Proposer/ })).not.toBeInTheDocument();

    await user.click(
      within(jaws).getByRole('button', { name: 'Voter pour « Les Dents de la mer »' })
    );
    expect(props.onVote).toHaveBeenCalledWith('m-jaws', 1);

    const marley = within(results).getAllByRole('listitem')[1]!;
    expect(marley).toHaveTextContent('Proposé par vous');
    expect(within(marley).queryByRole('button', { name: /^(Proposer|Voter)/ })).toBeNull();
  });

  it('opens a preview from the title and proposes with a word to convince', async () => {
    api.fetchMovieDetails.mockResolvedValue({
      tmdbId: 438631,
      title: 'Dune',
      overview: 'Paul Atreides suit sa famille sur Arrakis.',
      tagline: null,
      director: null,
      cast: [],
      runtimeMinutes: 155,
      genres: ['Science-fiction'],
      releaseDate: null,
      voteAverage: 7.8,
      posterPath: null,
      backdropPath: null,
      seasonCount: null,
      episodeCount: null,
      watchProviders: [],
      tmdbWatchPageUrl: null,
    });
    const user = userEvent.setup();
    renderDialog();
    await search(user, 'dune');

    await user.click(await screen.findByRole('button', { name: 'Voir la fiche de « Dune »' }));

    expect(
      await screen.findByText('Paul Atreides suit sa famille sur Arrakis.')
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Un mot pour convaincre/), 'Le désert en grand écran');
    await user.click(screen.getByRole('button', { name: 'Proposer à la soirée' }));

    await waitFor(() =>
      expect(api.addMovieToEvent).toHaveBeenCalledWith(
        'cine-club',
        expect.objectContaining({ tmdbId: 438631, pitchNote: 'Le désert en grand écran' })
      )
    );
    expect(await screen.findByRole('list', { name: 'Résultats de la recherche' })).toBeVisible();
  });

  it('closes from the bottom button', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    await user.click(screen.getAllByRole('button', { name: 'Fermer' }).at(-1)!);

    expect(props.onClose).toHaveBeenCalled();
  });
});
