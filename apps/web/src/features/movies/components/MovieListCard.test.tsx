import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import MovieListCard, { MovieRankBadge } from '@/features/movies/components/MovieListCard';
import { LocaleProvider } from '@/shared/i18n';

type CardProps = ComponentProps<typeof MovieListCard>;

function renderCard(props: Partial<CardProps> = {}) {
  return render(
    <LocaleProvider>
      <ul>
        <MovieListCard
          title="Dune"
          year="2021"
          posterPath="/dune.jpg"
          onOpenDetails={() => undefined}
          {...props}
        />
      </ul>
    </LocaleProvider>
  );
}

describe('MovieListCard', () => {
  it('shows the year, the vote and the runtime by default', () => {
    renderCard({ voteAverage: 8.1, runtimeMinutes: 155 });

    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getByTitle(/note moyenne tmdb/i)).toBeInTheDocument();
    expect(screen.getByTitle(/durée du film/i)).toBeInTheDocument();
  });

  it('lets the meta slot replace the year, vote and runtime grid', () => {
    renderCard({ meta: 'Dans 3 soirées', voteAverage: 8.1, runtimeMinutes: 155 });

    expect(screen.getByText('Dans 3 soirées')).toBeInTheDocument();
    expect(screen.queryByText('2021')).toBeNull();
    expect(screen.queryByTitle(/note moyenne tmdb/i)).toBeNull();
    expect(screen.queryByTitle(/durée du film/i)).toBeNull();
  });

  it('forwards the eager hint to the poster image', () => {
    const { container, unmount } = renderCard({ eager: true });
    const eagerImg = container.querySelector('img');
    expect(eagerImg).toHaveAttribute('loading', 'eager');
    expect(eagerImg).toHaveAttribute('fetchpriority', 'high');
    unmount();

    const lazy = renderCard();
    const lazyImg = lazy.container.querySelector('img');
    expect(lazyImg).toHaveAttribute('loading', 'lazy');
    expect(lazyImg).toHaveAttribute('fetchpriority', 'auto');
  });

  it('names the poster trigger after the movie and opens the details', async () => {
    const onOpenDetails = vi.fn();
    renderCard({ onOpenDetails });

    await userEvent.click(screen.getByRole('button', { name: 'Voir les détails de « Dune »' }));

    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('titles the card with a level 3 heading', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Dune', level: 3 })).toBeInTheDocument();
  });

  it('places the kebab in the poster region, before the title', () => {
    renderCard({ kebab: <button type="button">kebab</button> });
    const heading = screen.getByRole('heading', { name: 'Dune' });
    const kebab = screen.getByRole('button', { name: 'kebab' });
    expect(kebab.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('renders the badges slot over the poster', () => {
    renderCard({ badges: <MovieRankBadge rank={1} label="Rang 1" /> });

    expect(screen.getByText('Rang 1')).toHaveClass('visually-hidden');
    expect(screen.getByText('1')).toHaveAttribute('aria-hidden');
  });
});
