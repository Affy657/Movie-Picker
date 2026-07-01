import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MovieDetailsPanel, {
  MovieDetailsContent,
} from '@/features/movies/components/MovieDetailsPanel';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';

vi.mock('@/features/movies/hooks/useMovieDetails', () => ({ useMovieDetails: vi.fn() }));
vi.mock('@/shared/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const mockUseMovieDetails = vi.mocked(useMovieDetails);

const state = (overrides: Record<string, unknown> = {}) =>
  ({ data: undefined, isLoading: false, isError: false, ...overrides }) as never;

const fullData = {
  overview: 'Un rêve dans un rêve.',
  tagline: 'Ta pensée est-elle vraiment la tienne ?',
  director: 'Christopher Nolan',
  cast: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'],
  runtimeMinutes: 148,
  genres: ['Action', 'Sci-Fi'],
  releaseDate: '2010-07-16',
  trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMovieDetails.mockReturnValue(state());
});

describe('MovieDetailsPanel', () => {
  it('reveals the content section when the toggle is clicked', async () => {
    mockUseMovieDetails.mockReturnValue(state({ isLoading: true }));

    render(<MovieDetailsPanel tmdbId={27205} />);
    const toggle = screen.getByRole('button');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('movies.details.loading')).toBeInTheDocument();
  });
});

describe('MovieDetailsContent', () => {
  it('renders nothing while closed', () => {
    const { container } = render(<MovieDetailsContent tmdbId={1} open={false} panelId="p" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the loading state', () => {
    mockUseMovieDetails.mockReturnValue(state({ isLoading: true }));

    render(<MovieDetailsContent tmdbId={1} open panelId="p" />);

    expect(screen.getByText('movies.details.loading')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    mockUseMovieDetails.mockReturnValue(state({ isError: true }));

    render(<MovieDetailsContent tmdbId={1} open panelId="p" />);

    expect(screen.getByText('movies.details.error')).toBeInTheDocument();
  });

  it('renders the facts, tagline and overview from data', () => {
    mockUseMovieDetails.mockReturnValue(state({ data: fullData }));

    render(<MovieDetailsContent tmdbId={1} open panelId="p" />);

    expect(screen.getByText('Christopher Nolan')).toBeInTheDocument();
    expect(screen.getByText('A1, A2, A3, A4, A5, A6')).toBeInTheDocument();
    expect(screen.getByText('Action, Sci-Fi')).toBeInTheDocument();
    expect(screen.getByText(/Un rêve dans un rêve/)).toBeInTheDocument();
  });

  it('renders a trailer link that calls onPlayTrailer', async () => {
    mockUseMovieDetails.mockReturnValue(state({ data: fullData }));
    const onPlayTrailer = vi.fn();

    render(<MovieDetailsContent tmdbId={1} open panelId="p" onPlayTrailer={onPlayTrailer} />);
    await userEvent.click(screen.getByRole('button', { name: /trailerLink/ }));

    expect(onPlayTrailer).toHaveBeenCalledWith('https://www.youtube.com/watch?v=YoHD9XEInc0');
  });

  it('renders a trailer anchor when no onPlayTrailer is provided', () => {
    mockUseMovieDetails.mockReturnValue(state({ data: fullData }));

    render(<MovieDetailsContent tmdbId={1} open panelId="p" />);

    expect(screen.getByRole('link', { name: /trailerLink/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=YoHD9XEInc0'
    );
  });

  it('omits the trailer for a non-YouTube url', () => {
    mockUseMovieDetails.mockReturnValue(
      state({ data: { ...fullData, trailerUrl: 'https://vimeo.com/123' } })
    );

    render(<MovieDetailsContent tmdbId={1} open panelId="p" />);

    expect(screen.queryByText('movies.details.trailerLink')).not.toBeInTheDocument();
  });

  it('shows the empty state when data has no content', () => {
    mockUseMovieDetails.mockReturnValue(
      state({
        data: {
          overview: null,
          tagline: null,
          director: null,
          cast: [],
          runtimeMinutes: null,
          genres: [],
          releaseDate: null,
          trailerUrl: null,
        },
      })
    );

    render(<MovieDetailsContent tmdbId={1} open panelId="p" />);

    expect(screen.getByText('movies.details.empty')).toBeInTheDocument();
  });
});
