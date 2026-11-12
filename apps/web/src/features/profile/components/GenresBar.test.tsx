import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

  it('lists each genre in the order received, with its name and its count', () => {
    renderBar([
      { genreId: 878, count: 21 },
      { genreId: 53, count: 18 },
    ]);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/science-fiction\s*21/i);
    expect(rows[1]).toHaveTextContent(/thriller\s*18/i);
  });

  it('sizes each bar against the most proposed genre', () => {
    renderBar([
      { genreId: 878, count: 20 },
      { genreId: 53, count: 5 },
    ]);
    const [first, second] = screen.getAllByRole('listitem');
    const fill = (row: HTMLElement) =>
      row.querySelector<HTMLElement>('[class*="genreFill"]')?.style.width;
    expect(fill(first!)).toBe('100%');
    expect(fill(second!)).toBe('25%');
  });

  it('keeps a genre whose count is zero out of the list', () => {
    renderBar([
      { genreId: 878, count: 3 },
      { genreId: 53, count: 0 },
    ]);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });
});
