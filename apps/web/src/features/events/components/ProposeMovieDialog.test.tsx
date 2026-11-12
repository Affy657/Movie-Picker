import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import type { MovieData } from '@/shared/types/movie';
import type { MovieSearchItem } from '@/features/movies/api/moviesApi';
import ProposeMovieDialog from '@/features/events/components/ProposeMovieDialog';
import styles from '@/features/events/components/ProposeMovieDialog.module.css';

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
        tmdbId: 1920,
        mediaType: 'tv',
        title: 'Twin Peaks',
        year: '1990',
        posterPath: null,
        voteAverage: 8.6,
        runtimeMinutes: null,
        createdAt: '2026-11-05T10:00:00Z',
      },
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

const DUNE_DETAILS = {
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
};

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
    onVote: vi.fn(() => Promise.resolve()),
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
    api.fetchMovieDetails.mockResolvedValue(DUNE_DETAILS);
    const user = userEvent.setup();
    renderDialog();
    await search(user, 'dune');

    await user.click(await screen.findByRole('button', { name: 'Voir la fiche de « Dune »' }));

    expect(
      await screen.findByText('Paul Atreides suit sa famille sur Arrakis.')
    ).toBeInTheDocument();
    const pitch = screen.getByLabelText(/Un mot pour convaincre/);
    expect(pitch).toHaveClass('input');
    await user.type(pitch, 'Le désert en grand écran');
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

  it('leaves the series of my watchlist out when the night only takes movies', () => {
    renderDialog();

    const list = screen.getByRole('list', { name: 'Dans ma liste' });
    expect(list).not.toHaveTextContent('Twin Peaks');
  });

  it('offers the series of my watchlist when the night takes them', () => {
    renderDialog({ allowSeries: true });

    const rows = within(screen.getByRole('list', { name: 'Dans ma liste' })).getAllByRole(
      'listitem'
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Twin Peaks');
  });

  it('keeps the confirmation zone mounted in the footer before it has anything to say', async () => {
    const user = userEvent.setup();
    renderDialog();
    const live = document.querySelector(`.${styles.footer} output`);
    expect(live).not.toBeNull();
    expect(live).toBeEmptyDOMElement();
    await search(user, 'dune');

    await user.click(await screen.findByRole('button', { name: 'Proposer « Dune »' }));

    await waitFor(() => expect(live).toHaveTextContent('« Dune » est proposé à la soirée.'));
    expect(live).toBeInTheDocument();
  });

  it('shows a failed proposal in the footer, in place of the confirmation', async () => {
    api.addMovieToEvent.mockRejectedValueOnce(
      new Error('Limite de 3 proposition(s) par participant atteinte.')
    );
    const user = userEvent.setup();
    renderDialog();
    await search(user, 'dune');

    await user.click(await screen.findByRole('button', { name: 'Proposer « Dune »' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Limite de 3 proposition(s) par participant atteinte.'
      )
    );
    expect(screen.getByRole('alert').closest(`.${styles.footer}`)).not.toBeNull();
    expect(screen.queryByText(/est proposé à la soirée/)).not.toBeInTheDocument();
  });

  it('shows a failed undo in the footer', async () => {
    api.removeMovieFromEvent.mockRejectedValueOnce(new Error('Réseau indisponible'));
    const user = userEvent.setup();
    renderDialog();
    await search(user, 'dune');
    await user.click(await screen.findByRole('button', { name: 'Proposer « Dune »' }));

    await user.click(await screen.findByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Réseau indisponible'));
    expect(screen.getByRole('alert').closest(`.${styles.footer}`)).not.toBeNull();
  });

  it('greys the proposals out once I reached the limit of the night', () => {
    renderDialog({ maxProposals: 1 });

    expect(screen.getByRole('button', { name: 'Proposer « Past Lives »' })).toBeDisabled();
    expect(screen.getByText('Limite atteinte : 1 film proposé par personne')).toBeInTheDocument();
  });

  it('shows a vote in progress on its button, then a failed vote in the footer', async () => {
    let failVote: (reason: unknown) => void = () => undefined;
    const onVote = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          failVote = reject;
        })
    );
    const user = userEvent.setup();
    renderDialog({ onVote });
    await search(user, 'dents');
    const results = await screen.findByRole('list', { name: 'Résultats de la recherche' });
    const jaws = within(results).getAllByRole('listitem')[0]!;
    const vote = within(jaws).getByRole('button', { name: 'Voter pour « Les Dents de la mer »' });

    await user.click(vote);

    expect(vote).toHaveAttribute('aria-busy', 'true');
    failVote(new Error('La roue a déjà été lancée : les votes sont figés.'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'La roue a déjà été lancée : les votes sont figés.'
      )
    );
    expect(screen.getByRole('alert').closest(`.${styles.footer}`)).not.toBeNull();
    expect(vote).not.toHaveAttribute('aria-busy');
  });

  it('names a vote I already cast like any vote and lets the pressed state tell it', async () => {
    const user = userEvent.setup();
    renderDialog({
      movies: [
        movie({ id: 'm-jaws', tmdbId: 578, title: 'Les Dents de la mer', myVote: 1 }),
        ...NIGHT_MOVIES.slice(1),
      ],
    });
    await search(user, 'dents');
    const results = await screen.findByRole('list', { name: 'Résultats de la recherche' });
    const jaws = within(results).getAllByRole('listitem')[0]!;

    const vote = within(jaws).getByRole('button', { name: 'Voter pour « Les Dents de la mer »' });
    expect(vote).toHaveAttribute('aria-pressed', 'true');
    expect(vote).toHaveTextContent('Voté');
  });

  it('takes the streaming offers of the preview from the movie details when the search did not look them up', async () => {
    let answerDetails: (details: unknown) => void = () => undefined;
    api.fetchMovieDetails.mockImplementation(
      () =>
        new Promise((resolve) => {
          answerDetails = resolve;
        })
    );
    api.searchMovies.mockResolvedValue(searchResponse([{ ...DUNE, watchProviders: null }]));
    const user = userEvent.setup();
    renderDialog();
    await search(user, 'dune');

    await user.click(await screen.findByRole('button', { name: 'Voir la fiche de « Dune »' }));

    expect(screen.queryByText('Pas en streaming pour l’instant.')).not.toBeInTheDocument();
    answerDetails({
      ...DUNE_DETAILS,
      watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
    });
    expect(await screen.findByRole('img', { name: /Netflix/ })).toBeInTheDocument();
    expect(screen.queryByText('Pas en streaming pour l’instant.')).not.toBeInTheDocument();
  });

  it('opens the preview at its top with the focus on its title, and comes back where I was', async () => {
    api.fetchMovieDetails.mockResolvedValue(DUNE_DETAILS);
    const user = userEvent.setup();
    renderDialog();
    await search(user, 'dune');
    const scroller = document.querySelector<HTMLElement>(`.${styles.scroll}`)!;
    const opener = await screen.findByRole('button', { name: 'Voir la fiche de « Dune »' });
    scroller.scrollTop = 240;

    await user.click(opener);

    expect(await screen.findByRole('heading', { name: 'Dune' })).toHaveFocus();
    expect(scroller.scrollTop).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Retour' }));

    expect(scroller.scrollTop).toBe(240);
    expect(opener).toHaveFocus();
  });
});
