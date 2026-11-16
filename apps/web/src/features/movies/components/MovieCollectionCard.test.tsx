import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import MovieCollectionCard from './MovieCollectionCard';

function renderCard(props: Partial<Parameters<typeof MovieCollectionCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ul>
        <MovieCollectionCard
          to="/listes/l1"
          name="Halloween"
          movieCountLabel="8 films"
          stackSrcs={['/a.jpg', '/b.jpg']}
          {...props}
        />
      </ul>
    </MemoryRouter>
  );
}

describe('MovieCollectionCard', () => {
  it('links a stack of posters to its page with its name and count', () => {
    renderCard();

    const link = screen.getByRole('link', { name: /halloween/i });
    expect(link).toHaveAttribute('href', '/listes/l1');
    expect(within(link).getByText('8 films')).toBeInTheDocument();
    expect(link.querySelectorAll('img')).toHaveLength(2);
  });

  it('keeps a grey placeholder stack when there is no poster', () => {
    renderCard({ stackSrcs: [] });

    expect(screen.getByRole('link').querySelectorAll('img')).toHaveLength(0);
  });

  it('lays a badge over the front poster and a line under the count', () => {
    renderCard({
      badgeIcon: <svg data-testid="badge" />,
      extra: <span>Letterboxd</span>,
    });

    const link = screen.getByRole('link');
    expect(within(link).getByTestId('badge')).toBeInTheDocument();
    expect(within(link).getByText('Letterboxd')).toBeInTheDocument();
  });

  describe('as a row', () => {
    it('links a fan of posters, the name, the count and a line under it', () => {
      renderCard({
        layout: 'row',
        stackSrcs: ['/a.jpg', '/b.jpg', '/c.jpg'],
        nameSuffix: <span>Publique</span>,
        extra: <span>Avec Léa</span>,
      });

      const link = screen.getByRole('link', { name: /halloween/i });
      expect(link).toHaveAttribute('href', '/listes/l1');
      expect(link.querySelectorAll('img')).toHaveLength(3);
      expect(within(link).getByText('8 films')).toBeInTheDocument();
      expect(within(link).getByText('Publique')).toBeInTheDocument();
      expect(within(link).getByText('Avec Léa')).toBeInTheDocument();
    });

    it('draws the progress under the front poster only once a film is watched', () => {
      const { unmount } = renderCard({ layout: 'row', progress: 40 });

      expect(screen.getByRole('link').querySelector('[class*="progress"]')).not.toBeNull();
      unmount();

      renderCard({ layout: 'row', progress: null });
      expect(screen.getByRole('link').querySelector('[class*="progress"]')).toBeNull();
    });

    it('shows the empty icon in place of the posters of an empty list', () => {
      renderCard({ layout: 'row', stackSrcs: [], emptyIcon: <svg data-testid="empty" /> });

      const link = screen.getByRole('link');
      expect(link.querySelectorAll('img')).toHaveLength(0);
      expect(within(link).getByTestId('empty')).toBeInTheDocument();
    });
  });
});
