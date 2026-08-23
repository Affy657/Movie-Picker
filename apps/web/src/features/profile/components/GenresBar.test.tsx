import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import GenresBar from './GenresBar';

function renderBar(genres: { genreId: number; count: number }[]) {
  return render(
    <AppTestProviders>
      <GenresBar genres={genres} />
    </AppTestProviders>
  );
}

describe('GenresBar', () => {
  it('ne rend rien si tous les counts sont 0', () => {
    const { container } = renderBar([{ genreId: 28, count: 0 }]);
    expect(container.firstChild).toBeNull();
  });

  it('ne rend rien si la liste est vide', () => {
    const { container } = renderBar([]);
    expect(container.firstChild).toBeNull();
  });

  it('affiche les chips et la barre pour des genres avec des comptes positifs', () => {
    renderBar([
      { genreId: 28, count: 5 },
      { genreId: 12, count: 3 },
    ]);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('affiche le label pour un genreId connu', () => {
    renderBar([{ genreId: 28, count: 4 }]);
    expect(screen.getByRole('img', { hidden: false })).toBeInTheDocument();
  });

  it('boucle la palette pour plus de 6 genres', () => {
    const genres = Array.from({ length: 8 }, (_, i) => ({ genreId: i + 1, count: i + 1 }));
    renderBar(genres);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('affiche le total cumulé des genres affichés', () => {
    renderBar([
      { genreId: 28, count: 5 },
      { genreId: 12, count: 3 },
    ]);
    expect(screen.getByText(/top 6 des 8 genres cumulés/i)).toBeInTheDocument();
  });
});
