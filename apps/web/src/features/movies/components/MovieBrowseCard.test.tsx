import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import MovieBrowseCard, {
  type MovieBrowseCardItem,
} from '@/features/movies/components/MovieBrowseCard';
import { MovieRankBadge } from '@/features/movies/components/ShowcaseMovieCard';
import { LocaleProvider } from '@/shared/i18n';

type CardProps = ComponentProps<typeof MovieBrowseCard>;

const dune: MovieBrowseCardItem = {
  tmdbId: 438631,
  title: 'Dune',
  year: '2021',
  posterPath: '/dune.jpg',
  mediaType: 'movie',
};

function renderCard(props: Partial<CardProps> = {}) {
  const handlers = {
    onToggleWatchlist: vi.fn(),
    onProposeToEvent: vi.fn(),
    onOpenDetails: vi.fn(),
  };
  render(
    <LocaleProvider>
      <ul>
        <MovieBrowseCard
          item={dune}
          hasHover={false}
          isLoggedIn={false}
          inWatchlist={false}
          {...handlers}
          {...props}
        />
      </ul>
    </LocaleProvider>
  );
  return handlers;
}

const kebabTrigger = () =>
  screen.getByRole('button', { name: /plus d’actions pour «\s*dune\s*»/i });

describe('MovieBrowseCard', () => {
  it('without hover capability: no kebab, the poster trigger is the only button', async () => {
    const handlers = renderCard({ hasHover: false, isLoggedIn: true });

    expect(screen.queryByRole('button', { name: /plus d’actions/i })).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Voir les détails de « Dune »' });
    expect(screen.getAllByRole('button')).toEqual([trigger]);

    await userEvent.click(trigger);
    expect(handlers.onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('hover, visitor: the poster shows no action, only the details trigger', () => {
    renderCard({ hasHover: true, isLoggedIn: false });

    expect(screen.getAllByRole('button')).toEqual([
      screen.getByRole('button', { name: 'Voir les détails de « Dune »' }),
    ]);
  });

  it('hover, logged in: no kebab, the poster offers the watchlist toggle then Proposer', async () => {
    const user = userEvent.setup();
    const handlers = renderCard({ hasHover: true, isLoggedIn: true, inWatchlist: false });

    expect(screen.queryByRole('button', { name: /plus d’actions/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ajouter à ma liste' }));
    expect(handlers.onToggleWatchlist).toHaveBeenCalledTimes(1);

    const propose = screen.getByRole('button', { name: 'Proposer « Dune » dans une soirée' });
    expect(propose).toHaveTextContent('Proposer');
    await user.click(propose);
    expect(handlers.onProposeToEvent).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenDetails).not.toHaveBeenCalled();
  });

  it('hover, logged in: the keyboard reaches the details, the watchlist toggle then Proposer', async () => {
    const user = userEvent.setup();
    renderCard({ hasHover: true, isLoggedIn: true });

    await user.tab();
    expect(screen.getByRole('button', { name: 'Voir les détails de « Dune »' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Ajouter à ma liste' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /^Proposer « Dune »/ })).toHaveFocus();
  });

  it('in the watchlist: the badge shows at rest and the toggle reads Retirer de ma liste', async () => {
    const user = userEvent.setup();
    const handlers = renderCard({ hasHover: true, isLoggedIn: true, inWatchlist: true });

    expect(screen.getByRole('img', { name: 'Déjà dans votre liste' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retirer de ma liste' }));
    expect(handlers.onToggleWatchlist).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Ajouter à ma liste' })).toBeNull();
  });

  it('on the watchlist itself: no in-list badge, the toggle still removes the movie', () => {
    renderCard({ hasHover: true, isLoggedIn: true, inWatchlist: true, showListBadge: false });

    expect(screen.queryByRole('img', { name: 'Déjà dans votre liste' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirer de ma liste' })).toBeInTheDocument();
  });

  it('in the watchlist on a touch screen: the badge shows, no action button', () => {
    renderCard({ hasHover: false, isLoggedIn: true, inWatchlist: true });

    expect(screen.getByRole('img', { name: 'Déjà dans votre liste' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retirer de ma liste' })).toBeNull();
  });

  it('row layout keeps the kebab on a hover-capable device', () => {
    renderCard({ layout: 'row', hasHover: true, isLoggedIn: true });

    expect(kebabTrigger()).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('row layout on mobile: no kebab even with hover, the row still opens the details', async () => {
    const handlers = renderCard({
      layout: 'row',
      isMobile: true,
      hasHover: true,
      isLoggedIn: true,
    });

    expect(screen.queryByRole('button', { name: /plus d’actions/i })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Voir les détails de « Dune »' }));
    expect(handlers.onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('row layout translates the genre ids, keeps three at most, and flags a series', () => {
    renderCard({
      layout: 'row',
      item: { ...dune, mediaType: 'tv', genreIds: [18, 53, 18, 878, 28] },
    });

    expect(screen.getByText('Drame, Thriller, Science-fiction')).toBeInTheDocument();
    expect(screen.getByText('Série')).toBeInTheDocument();
  });

  it('stacks the leading badge and the TV badge over the poster', () => {
    renderCard({
      item: { ...dune, mediaType: 'tv' },
      leadingBadge: <MovieRankBadge rank={2} label="Rang 2" stacked />,
    });

    expect(screen.getByText('Rang 2')).toBeInTheDocument();
    expect(screen.getByText('Série')).toBeInTheDocument();
  });

  it('shows no badge for a plain movie', () => {
    renderCard();

    expect(screen.queryByText('Série')).toBeNull();
  });
});
