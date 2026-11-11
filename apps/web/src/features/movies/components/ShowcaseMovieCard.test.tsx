import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import ShowcaseMovieCard, { MovieRankBadge } from '@/features/movies/components/ShowcaseMovieCard';
import { LocaleProvider } from '@/shared/i18n';

type CardProps = ComponentProps<typeof ShowcaseMovieCard>;

function renderCard(props: Partial<CardProps> = {}) {
  return render(
    <LocaleProvider>
      <ul>
        <ShowcaseMovieCard
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

describe('ShowcaseMovieCard', () => {
  it('puts the title and the facts on the poster, with nothing under it', () => {
    const { container } = renderCard({ voteAverage: 8.1, runtimeMinutes: 155 });
    const card = container.querySelector('li');
    const heading = screen.getByRole('heading', { name: 'Dune', level: 3 });

    expect(card?.children).toHaveLength(1);
    expect(card?.firstElementChild).toContainElement(container.querySelector('img'));
    expect(card?.firstElementChild).toContainElement(heading);
    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getByTitle(/note moyenne tmdb/i)).toBeInTheDocument();
    expect(screen.getByTitle(/durée du film/i)).toBeInTheDocument();
  });

  it('lets the meta slot replace the year, vote and runtime', () => {
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

  it('places the actions after the title and the facts, on the poster', () => {
    const { container } = renderCard({ actions: <button type="button">Proposer</button> });
    const heading = screen.getByRole('heading', { name: 'Dune' });
    const action = screen.getByRole('button', { name: 'Proposer' });

    expect(container.querySelector('li')?.firstElementChild).toContainElement(action);
    expect(heading.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('renders the corner badge over the poster', () => {
    const { container } = renderCard({
      cornerBadge: <span role="img" aria-label="Dans ma liste" />,
    });

    expect(container.querySelector('li')?.firstElementChild).toContainElement(
      screen.getByRole('img', { name: 'Dans ma liste' })
    );
  });

  it('renders the badges slot over the poster', () => {
    renderCard({ badges: <MovieRankBadge rank={1} label="Rang 1" /> });

    expect(screen.getByText('Rang 1')).toHaveClass('visually-hidden');
    expect(screen.getByText('1')).toHaveAttribute('aria-hidden');
  });
});
