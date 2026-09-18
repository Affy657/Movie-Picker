import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  MovieDetailsContent,
  type MovieDetailsFacts,
  type MovieDetailsQueryState,
} from '@/features/movies/components/MovieDetailsPanel';

vi.mock('@/shared/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}(${Object.values(vars).join('|')})` : key,
    locale: 'fr',
  }),
}));

const state = (overrides: Partial<MovieDetailsQueryState> = {}): MovieDetailsQueryState => ({
  data: undefined,
  isLoading: false,
  isError: false,
  ...overrides,
});

const fullData: MovieDetailsFacts = {
  overview: 'Un rêve dans un rêve.',
  tagline: 'Ta pensée est-elle vraiment la tienne ?',
  director: 'Christopher Nolan',
  cast: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'],
  runtimeMinutes: 148,
  releaseDate: '2010-07-16',
  trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
  episodeCount: null,
};

describe('MovieDetailsContent', () => {
  it('shows the loading state', () => {
    render(<MovieDetailsContent query={state({ isLoading: true })} panelId="p" />);

    expect(screen.getByText('movies.details.loading')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    render(<MovieDetailsContent query={state({ isError: true })} panelId="p" />);

    expect(screen.getByText('movies.details.error')).toBeInTheDocument();
  });

  it('renders the tagline, the overview and the facts that are not already in the header', () => {
    render(<MovieDetailsContent query={state({ data: fullData })} panelId="p" />);

    expect(screen.getByText('movies.details.directorLabel')).toBeInTheDocument();
    expect(screen.getByText('Christopher Nolan')).toBeInTheDocument();
    expect(screen.getByText('A1, A2, A3, A4, A5, A6')).toBeInTheDocument();
    expect(screen.getByText('movies.details.releasedLabel')).toBeInTheDocument();
    expect(screen.getByText('16 juillet 2010')).toBeInTheDocument();
    expect(screen.queryByText('2010-07-16')).not.toBeInTheDocument();
    expect(screen.queryByText('2h28')).not.toBeInTheDocument();
    expect(screen.queryByText('movies.details.episodesLabel')).not.toBeInTheDocument();
    expect(screen.getByText(/Un rêve dans un rêve/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'movies.details.regionLabel' })).toBeInTheDocument();
  });

  it('a series names its creators, its episodes and its first air date', () => {
    render(
      <MovieDetailsContent
        query={state({
          data: {
            ...fullData,
            director: 'David Benioff, D. B. Weiss',
            episodeCount: 73,
            runtimeMinutes: 57,
          },
        })}
        mediaType="tv"
        panelId="p"
      />
    );

    expect(screen.getByText('movies.details.creatorLabel')).toBeInTheDocument();
    expect(screen.getByText('movies.details.episodesLabel')).toBeInTheDocument();
    expect(
      screen.getByText('movies.details.episodesWithRuntime(movies.details.episodesMany(73)|57min)')
    ).toBeInTheDocument();
    expect(screen.getByText('movies.details.firstAiredLabel')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'movies.details.regionLabelShow' })
    ).toBeInTheDocument();
  });

  it('a series with a single known episode length shows it alone', () => {
    render(
      <MovieDetailsContent
        query={state({ data: { ...fullData, episodeCount: null, runtimeMinutes: 45 } })}
        mediaType="tv"
        panelId="p"
      />
    );

    expect(screen.getByText('movies.details.episodeRuntime(45min)')).toBeInTheDocument();
  });

  it('keeps a release date it cannot parse as is', () => {
    render(
      <MovieDetailsContent
        query={state({ data: { ...fullData, releaseDate: '2010' } })}
        panelId="p"
      />
    );

    expect(screen.getByText('2010')).toBeInTheDocument();
  });

  it('renders a trailer link that calls onPlayTrailer', async () => {
    const onPlayTrailer = vi.fn();

    render(
      <MovieDetailsContent
        query={state({ data: fullData })}
        panelId="p"
        onPlayTrailer={onPlayTrailer}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /trailerLink/ }));

    expect(onPlayTrailer).toHaveBeenCalledWith('https://www.youtube.com/watch?v=YoHD9XEInc0');
  });

  it('renders a trailer anchor when no onPlayTrailer is provided', () => {
    render(<MovieDetailsContent query={state({ data: fullData })} panelId="p" />);

    expect(screen.getByRole('link', { name: /trailerLink/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=YoHD9XEInc0'
    );
  });

  it('omits the trailer for a non-YouTube url', () => {
    render(
      <MovieDetailsContent
        query={state({ data: { ...fullData, trailerUrl: 'https://vimeo.com/123' } })}
        panelId="p"
      />
    );

    expect(screen.queryByText('movies.details.trailerLink')).not.toBeInTheDocument();
  });

  it('shows the empty state when data has no content', () => {
    render(
      <MovieDetailsContent
        query={state({
          data: {
            overview: null,
            tagline: null,
            director: null,
            cast: [],
            runtimeMinutes: null,
            releaseDate: null,
            trailerUrl: null,
            episodeCount: null,
          },
        })}
        panelId="p"
      />
    );

    expect(screen.getByText('movies.details.empty')).toBeInTheDocument();
  });
});
