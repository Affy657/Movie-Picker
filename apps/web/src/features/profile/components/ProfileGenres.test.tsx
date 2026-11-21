import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileGenres from './ProfileGenres';

function renderGenres(genres: { genreId: number; count: number }[], moviesProposed: number) {
  return render(
    <AppTestProviders>
      <ProfileGenres genres={genres} moviesProposed={moviesProposed} />
    </AppTestProviders>
  );
}

describe('ProfileGenres', () => {
  it('renders nothing while no movie is proposed', () => {
    const { container } = renderGenres([], 0);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives each genre its share of the proposed movies, in the order received', () => {
    renderGenres(
      [
        { genreId: 18, count: 36 },
        { genreId: 878, count: 23 },
        { genreId: 53, count: 0 },
      ],
      61
    );
    expect(screen.getByRole('heading', { name: 'Genres préférés', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('sur 61 films proposés')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/^Drame59\s%$/);
    expect(rows[1]).toHaveTextContent(/^Science-fiction38\s%$/);
    expect(screen.getByText('Un film compte dans chacun de ses genres.')).toBeInTheDocument();
  });

  it('waits for five proposed movies before drawing any genre', () => {
    renderGenres(
      [
        { genreId: 18, count: 2 },
        { genreId: 35, count: 2 },
      ],
      3
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(
      screen.getByText('Ils s’afficheront à partir de 5 films proposés (3 pour l’instant).')
    ).toBeInTheDocument();
  });
});
