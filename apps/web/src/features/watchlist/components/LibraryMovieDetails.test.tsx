import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { fetchMovieDetails, type MovieDetails } from '@/features/movies/api/moviesApi';
import { useWatchlistToggle } from '@/features/watchlist/hooks/useWatchlistToggle';
import LibraryMovieDetails, {
  useLibraryMovieDetails,
  type LibraryMovieSeed,
} from './LibraryMovieDetails';

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'u1', ratingScale: 'ten' }, isLoading: false }),
}));
vi.mock('@/features/movies/api/moviesApi', () => ({ fetchMovieDetails: vi.fn() }));
vi.mock('@/features/watchlist/hooks/useWatchlistToggle', () => ({
  useWatchlistToggle: vi.fn(),
}));

const mockFetchDetails = vi.mocked(fetchMovieDetails);
const mockUseWatchlistToggle = vi.mocked(useWatchlistToggle);

const SEED: LibraryMovieSeed = {
  tmdbId: 603,
  mediaType: 'movie',
  title: 'Matrix',
  year: '1999',
  posterPath: null,
  voteAverage: 8.2,
  runtimeMinutes: 136,
};

const DETAILS: MovieDetails = {
  tmdbId: 603,
  title: 'The Matrix',
  overview: 'Un pirate informatique.',
  tagline: null,
  director: 'Lana Wachowski',
  cast: [],
  runtimeMinutes: 136,
  genres: ['Action'],
  releaseDate: '1999-03-31',
  trailerUrl: null,
  voteAverage: 8.2,
  posterPath: null,
  backdropPath: null,
  seasonCount: null,
  episodeCount: null,
  watchProviders: [],
  tmdbWatchPageUrl: null,
};

function Harness({
  onPropose,
  seedOnOpen,
}: Readonly<{ onPropose: (item: LibraryMovieSeed) => void; seedOnOpen?: LibraryMovieSeed }>) {
  const details = useLibraryMovieDetails();
  const location = useLocation();
  const watchlist = useWatchlistToggle(true);
  return (
    <>
      <span data-testid="search">{location.search}</span>
      <button type="button" onClick={() => details.open(seedOnOpen ?? SEED, 'availability')}>
        ouvrir
      </button>
      <LibraryMovieDetails
        target={details.target}
        seed={details.seed}
        initialTab={details.initialTab}
        watchlist={watchlist}
        onPropose={onPropose}
        onClose={details.close}
      />
    </>
  );
}

function renderAt(entry: string, props: Parameters<typeof Harness>[0]) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientWrapper>
        <LocaleProvider>
          <Harness {...props} />
        </LocaleProvider>
      </QueryClientWrapper>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchDetails.mockResolvedValue(DETAILS);
  mockUseWatchlistToggle.mockReturnValue({ has: () => false, toggle: vi.fn(), error: null });
});

describe('LibraryMovieDetails', () => {
  it('opens on the seed the page hands over, on the requested tab, and writes the URL', async () => {
    const user = userEvent.setup();
    renderAt('/watchlist', { onPropose: vi.fn() });

    await user.click(screen.getByRole('button', { name: 'ouvrir' }));

    expect(screen.getByTestId('search')).toHaveTextContent('?film=603');
    expect(await screen.findByRole('heading', { name: 'Matrix', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('2h16')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /où regarder/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('reached from the URL alone, it builds the header and the actions from the TMDB details', async () => {
    const onPropose = vi.fn();
    const toggle = vi.fn();
    mockUseWatchlistToggle.mockReturnValue({ has: () => true, toggle, error: null });
    const user = userEvent.setup();
    renderAt('/watchlist?film=603', { onPropose });

    expect(
      await screen.findByRole('heading', { name: 'The Matrix', level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(mockFetchDetails).toHaveBeenCalledWith(
      603,
      expect.objectContaining({ mediaType: 'movie' })
    );

    await user.click(screen.getByRole('button', { name: 'Retirer de ma liste' }));
    expect(toggle).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdbId: 603,
        mediaType: 'movie',
        title: 'The Matrix',
        year: '1999',
      })
    );

    await user.click(screen.getByRole('button', { name: 'Proposer dans une soirée' }));
    expect(onPropose).toHaveBeenCalledWith(expect.objectContaining({ title: 'The Matrix' }));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(''));
    expect(screen.queryByRole('heading', { name: 'The Matrix', level: 2 })).not.toBeInTheDocument();
  });

  it('closing clears the URL and a series is addressed by ?serie', async () => {
    const user = userEvent.setup();
    renderAt('/watchlist', {
      onPropose: vi.fn(),
      seedOnOpen: { ...SEED, tmdbId: 1399, mediaType: 'tv', title: 'Game of Thrones' },
    });

    await user.click(screen.getByRole('button', { name: 'ouvrir' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?serie=1399');
    await screen.findByRole('heading', { name: 'Game of Thrones', level: 2 });

    await user.click(screen.getByRole('button', { name: /fermer/i }));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(''));
    expect(
      screen.queryByRole('heading', { name: 'Game of Thrones', level: 2 })
    ).not.toBeInTheDocument();
  });
});
