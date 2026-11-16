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

  it('keeps the actions of the card out of its link', () => {
    renderCard({ footer: <button type="button">Ne plus enregistrer</button> });

    const button = screen.getByRole('button', { name: 'Ne plus enregistrer' });
    expect(screen.getByRole('link')).not.toContainElement(button);
    expect(screen.getByRole('listitem')).toContainElement(button);
  });
});
