import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import { MovieCast, MovieCrew, MovieSynopsis, MovieVideos } from '@/app/pages/movie/MovieSections';

const OVERVIEW = 'Prue part seule dans le Bois Impassable pour retrouver son petit frère.';

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

function stubParagraphHeights(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
}

describe('MovieSynopsis', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens a long synopsis in place and folds it back', async () => {
    stubParagraphHeights(400, 160);
    renderWithLocale(
      <MovieSynopsis overview={OVERVIEW} tagline="Toute forêt garde ses secrets." />
    );

    expect(screen.getByText('« Toute forêt garde ses secrets. »')).toBeInTheDocument();
    const more = screen.getByRole('button', { name: /lire la suite/i });
    expect(more).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(more);

    expect(screen.getByRole('button', { name: /réduire/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('shows no button when the synopsis fits', () => {
    stubParagraphHeights(100, 100);
    renderWithLocale(<MovieSynopsis overview={OVERVIEW} tagline={null} />);

    expect(screen.queryByRole('button', { name: /lire la suite/i })).toBeNull();
  });

  it('says when there is no synopsis yet', () => {
    renderWithLocale(<MovieSynopsis overview={null} tagline={null} />);

    expect(screen.getByText('Pas encore de synopsis pour ce film.')).toBeInTheDocument();
  });
});

describe('MovieVideos', () => {
  it('plays the chosen video and describes its kind and language', async () => {
    const onPlay = vi.fn();
    const teaser = { key: 'b', name: 'Teaser', type: 'Teaser', language: 'en' };
    renderWithLocale(
      <MovieVideos
        videos={[{ key: 'a', name: 'Bande-annonce', type: 'Trailer', language: 'fr' }, teaser]}
        onPlay={onPlay}
      />
    );

    expect(screen.getByRole('heading', { name: 'Vidéos' })).toBeInTheDocument();
    expect(screen.getByText('Bande-annonce, version française')).toBeInTheDocument();
    expect(screen.getByText('Teaser, version originale')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lire « Teaser »' }));
    expect(onPlay).toHaveBeenCalledWith(teaser);
  });

  it('renders nothing without videos', () => {
    const { container } = renderWithLocale(<MovieVideos videos={[]} onPlay={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('MovieCast', () => {
  const cast = Array.from({ length: 10 }, (_, index) => ({
    name: `Acteur ${index + 1}`,
    character: index === 0 ? 'Paul' : null,
    profilePath: index === 1 ? 'https://image.tmdb.org/t/p/w185/a.jpg' : null,
  }));

  it('shows eight people first, then everyone on demand', async () => {
    renderWithLocale(<MovieCast cast={cast} />);

    expect(screen.getByText('Acteur 8')).toBeInTheDocument();
    expect(screen.queryByText('Acteur 9')).toBeNull();
    expect(screen.getByText('Paul')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tout voir' }));

    expect(screen.getByText('Acteur 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réduire' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});

describe('MovieCrew', () => {
  it('renders nothing without crew', () => {
    const { container } = renderWithLocale(<MovieCrew crew={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
