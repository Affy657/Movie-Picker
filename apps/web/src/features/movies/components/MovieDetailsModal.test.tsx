import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieDetailsModal, {
  type MovieDetailsEventContext,
} from '@/features/movies/components/MovieDetailsModal';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import type { MovieDetails } from '@/features/movies/api/moviesApi';
import type { MovieData } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';

vi.mock('@/features/movies/hooks/useMovieDetails', () => ({ useMovieDetails: vi.fn() }));
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'u1', ratingScale: 'ten' }, isLoading: false }),
}));

const mockUseMovieDetails = vi.mocked(useMovieDetails);

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

const movie: MovieData = {
  id: 'm1',
  eventId: 'e1',
  participantId: 'p1',
  tmdbId: 27205,
  title: 'Inception',
  year: '2010',
  posterPath: null,
  proposerPseudo: 'Alice',
  score: 2,
  up: 3,
  down: 1,
  myVote: null,
  seenCount: 1,
  seenByPseudos: ['Bob'],
  votersUpPseudos: ['Alice', 'Bob', 'Tom'],
  createdAt: '2026-08-20T10:00:00.000Z',
};

function details(overrides: Partial<MovieDetails> = {}): MovieDetails {
  return {
    tmdbId: 27205,
    title: 'Inception',
    overview: null,
    tagline: null,
    director: null,
    cast: [],
    runtimeMinutes: null,
    genres: [],
    releaseDate: null,
    trailerUrl: null,
    voteAverage: null,
    posterPath: null,
    backdropPath: null,
    seasonCount: null,
    episodeCount: null,
    watchProviders: [],
    tmdbWatchPageUrl: null,
    ...overrides,
  };
}

function eventContext(overrides: Partial<MovieDetailsEventContext> = {}): MovieDetailsEventContext {
  return {
    movie,
    canAct: true,
    participantCount: 5,
    onVote: vi.fn(),
    iMarkedSeen: false,
    seenPending: false,
    onToggleSeen: vi.fn(),
    seenOthers: ['Bob'],
    seenOthersHint: 'Déjà vu par Bob.',
    proposerAvatarId: '',
    canRemove: true,
    isMine: true,
    isHost: false,
    onRemove: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMovieDetails.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as never);
});

describe('MovieDetailsModal', () => {
  it("ne rend rien tant que la modale n'est pas ouverte", () => {
    const { container } = renderWithLocale(
      <MovieDetailsModal open={false} title="Inception" tmdbId={27205} onClose={vi.fn()} />
    );
    expect(container.querySelector('[role="tablist"]')).not.toBeInTheDocument();
  });

  it('shows the header with title, year, runtime and the rating on the account scale', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        year="2010"
        tmdbId={27205}
        runtimeMinutes={148}
        voteAverage={8.8}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('2h28')).toBeInTheDocument();
    expect(screen.getByText('8.8/10')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('completes the header from TMDB when the page only knows the id: title, year, poster, facts, genres and backdrop', () => {
    mockUseMovieDetails.mockReturnValue({
      data: details({
        title: 'Le Parrain',
        releaseDate: '1972-03-14',
        runtimeMinutes: 175,
        voteAverage: 8.7,
        genres: ['Drame', 'Crime'],
        posterPath: 'https://image.tmdb.org/t/p/w154/parrain.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w780/parrain-wide.jpg',
      }),
      isLoading: false,
      isError: false,
    } as never);
    const { container } = renderWithLocale(
      <MovieDetailsModal open tmdbId={238} onClose={vi.fn()} />
    );
    expect(screen.getByRole('heading', { name: 'Le Parrain' })).toBeInTheDocument();
    expect(screen.getByText('1972')).toBeInTheDocument();
    expect(screen.getByText('2h55')).toBeInTheDocument();
    expect(screen.getByText('8.7/10')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Genres' })).toHaveTextContent('DrameCrime');
    const images = Array.from(container.querySelectorAll('img')).map((img) =>
      img.getAttribute('src')
    );
    expect(images).toContain('https://image.tmdb.org/t/p/w780/parrain-wide.jpg');
    expect(images).toContain('https://image.tmdb.org/t/p/w154/parrain.jpg');
  });

  it('what the page passes wins over TMDB for the facts', () => {
    mockUseMovieDetails.mockReturnValue({
      data: details({
        title: 'Autre',
        releaseDate: '1999-01-01',
        runtimeMinutes: 90,
        voteAverage: 5,
      }),
      isLoading: false,
      isError: false,
    } as never);
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        year="2010"
        tmdbId={27205}
        runtimeMinutes={148}
        voteAverage={8.8}
        ratingScale="five"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('2h28')).toBeInTheDocument();
    expect(screen.getByText('4.4/5')).toBeInTheDocument();
  });

  it('a series shows its seasons instead of a runtime and names its tab accordingly', () => {
    mockUseMovieDetails.mockReturnValue({
      data: details({
        title: 'Game of Thrones',
        seasonCount: 8,
        episodeCount: 73,
        runtimeMinutes: 57,
      }),
      isLoading: false,
      isError: false,
    } as never);
    renderWithLocale(
      <MovieDetailsModal open tmdbId={1399} mediaType="tv" year="2011" onClose={vi.fn()} />
    );
    expect(screen.getByText('8 saisons')).toBeInTheDocument();
    expect(screen.queryByText('57min')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /La série/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Le film/ })).not.toBeInTheDocument();
  });

  it('without a movie night context: only two tabs, opened on "The movie"', () => {
    renderWithLocale(<MovieDetailsModal open title="Inception" tmdbId={27205} onClose={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((el) => el.textContent)).toEqual([
      expect.stringContaining('Le film'),
      expect.stringContaining('Où regarder'),
    ]);
    expect(screen.getByRole('tab', { name: /Le film/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('with a movie night context: three tabs, opened on "The movie night"', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext()}
        onClose={vi.fn()}
      />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /La soirée/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('honours an explicit initial tab (e.g. "Where to watch")', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        initialTab="dispo"
        eventContext={eventContext()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('tab', { name: /Où regarder/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('The movie tab: shows the external links row', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        year="2010"
        tmdbId={27205}
        initialTab="film"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('link', { name: /Letterboxd/i })).toHaveAttribute(
      'href',
      'https://letterboxd.com/tmdb/27205/'
    );
    expect(screen.getByRole('link', { name: /IMDb/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AlloCiné/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /TMDB/i })).toBeInTheDocument();
  });

  it('changer d’onglet au clic affiche le panneau correspondant', async () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Score')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Où regarder/ }));
    expect(screen.queryByText('Score')).not.toBeInTheDocument();
    expect(screen.getByText(/pas en streaming/i)).toBeInTheDocument();
  });

  it('The movie night tab: shows the score, the "for" voters and the proposer', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('Alice, Bob, Tom')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('The movie night tab: the vote buttons call onVote with 1 then -1', async () => {
    const onVote = vi.fn();
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext({ onVote })}
        onClose={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Voter pour' }));
    await userEvent.click(screen.getByRole('button', { name: 'Voter contre' }));
    expect(onVote).toHaveBeenNthCalledWith(1, 1);
    expect(onVote).toHaveBeenNthCalledWith(2, -1);
  });

  it('The movie night tab: hides the "My vote" block when canAct is false', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext({ canAct: false })}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Mon vote')).not.toBeInTheDocument();
  });

  it('footer: toggles the watchlist, excludes from the draw and removes from the movie night', async () => {
    const onToggleWatchlist = vi.fn();
    const onToggle = vi.fn();
    const onRemove = vi.fn();
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext({
          onToggleWatchlist,
          wheelExclusion: { excluded: false, onToggle },
          onRemove,
        })}
        onClose={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter à ma liste' }));
    expect(onToggleWatchlist).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Exclure du tirage' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: /Retirer/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('footer: nothing without any context', () => {
    renderWithLocale(<MovieDetailsModal open title="Inception" tmdbId={27205} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Ajouter à ma liste' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Proposer dans une soirée' })
    ).not.toBeInTheDocument();
  });

  it('library footer: toggles the watchlist', async () => {
    const onToggleWatchlist = vi.fn();
    const { rerender } = renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        libraryContext={{ inWatchlist: false, onToggleWatchlist }}
        onClose={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter à ma liste' }));
    expect(onToggleWatchlist).toHaveBeenCalledTimes(1);

    rerender(
      <LocaleProvider>
        <MovieDetailsModal
          open
          title="Inception"
          tmdbId={27205}
          libraryContext={{ inWatchlist: true, onToggleWatchlist }}
          onClose={vi.fn()}
        />
      </LocaleProvider>
    );
    expect(screen.getByRole('button', { name: 'Retirer de ma liste' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter à ma liste' })).not.toBeInTheDocument();
  });

  it('library footer: proposing closes the modal first', async () => {
    const onProposeToEvent = vi.fn();
    const onClose = vi.fn();
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        libraryContext={{ onProposeToEvent }}
        onClose={onClose}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Proposer dans une soirée' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onProposeToEvent).toHaveBeenCalledTimes(1);
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      onProposeToEvent.mock.invocationCallOrder[0]!
    );
  });

  it('library footer: only the provided actions', () => {
    const { rerender } = renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        libraryContext={{ onToggleWatchlist: vi.fn() }}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Ajouter à ma liste' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Proposer dans une soirée' })
    ).not.toBeInTheDocument();

    rerender(
      <LocaleProvider>
        <MovieDetailsModal
          open
          title="Inception"
          tmdbId={27205}
          libraryContext={{}}
          onClose={vi.fn()}
        />
      </LocaleProvider>
    );
    expect(screen.queryByRole('button', { name: 'Ajouter à ma liste' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Proposer dans une soirée' })
    ).not.toBeInTheDocument();
  });

  it('event context wins over the library context', () => {
    const onToggleWatchlist = vi.fn();
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext({ onToggleWatchlist, isInWatchlist: false })}
        libraryContext={{ onToggleWatchlist: vi.fn(), onProposeToEvent: vi.fn() }}
        onClose={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('button', { name: 'Proposer dans une soirée' })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ajouter à ma liste' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^Retirer Inception$/ })).toBeInTheDocument();
  });

  it('without provided watchProviders (e.g. from the watchlist): fetches the availability through useMovieDetails', () => {
    mockUseMovieDetails.mockReturnValue({
      data: details({
        watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
        tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/27205/watch',
      }),
      isLoading: false,
      isError: false,
    } as never);

    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        initialTab="dispo"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('tab', { name: /Où regarder/ })).toHaveTextContent('1');
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('with provided watchProviders (e.g. an already enriched movie night card): ignores useMovieDetails', () => {
    mockUseMovieDetails.mockReturnValue({
      data: details({
        watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
        tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/27205/watch',
      }),
      isLoading: false,
      isError: false,
    } as never);

    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        initialTab="dispo"
        watchProviders={[]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/pas en streaming/i)).toBeInTheDocument();
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  it('le bouton fermer appelle onClose', async () => {
    const onClose = vi.fn();
    renderWithLocale(<MovieDetailsModal open title="Inception" tmdbId={27205} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
