import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import MovieBrowseCard, {
  type MovieBrowseCardItem,
} from '@/features/movies/components/MovieBrowseCard';
import { MovieRankBadge } from '@/features/movies/components/MovieListCard';
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

async function openKebab(props: Partial<CardProps> = {}) {
  const user = userEvent.setup();
  const handlers = renderCard({ hasHover: true, ...props });
  await user.click(kebabTrigger());
  return { user, handlers };
}

const menuItemNames = () =>
  screen
    .getAllByRole('menuitem')
    .map((item) => item.getAttribute('aria-label') ?? item.textContent);

describe('MovieBrowseCard', () => {
  it('without hover capability: no kebab, the poster trigger is the only button', async () => {
    const handlers = renderCard({ hasHover: false, isLoggedIn: true });

    expect(screen.queryByRole('button', { name: /plus d’actions/i })).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Voir les détails de « Dune »' });
    expect(screen.getAllByRole('button')).toEqual([trigger]);

    await userEvent.click(trigger);
    expect(handlers.onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('hover, visitor: the kebab offers the details and Letterboxd only', async () => {
    await openKebab({ isLoggedIn: false });

    expect(menuItemNames()).toEqual(['Voir les détails', 'Ouvrir sur Letterboxd']);
    expect(screen.getAllByRole('separator')).toHaveLength(1);
  });

  it('hover, logged in: details, watchlist toggle, proposal then Letterboxd', async () => {
    const { user, handlers } = await openKebab({ isLoggedIn: true, inWatchlist: false });

    expect(menuItemNames()).toEqual([
      'Voir les détails',
      'Ajouter à ma liste',
      'Proposer dans une soirée',
      'Ouvrir sur Letterboxd',
    ]);
    expect(screen.queryByRole('menuitem', { name: /^retirer dune$/i })).toBeNull();

    await user.click(screen.getByRole('menuitem', { name: 'Proposer dans une soirée' }));
    expect(handlers.onProposeToEvent).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('hover, in the watchlist: the toggle reads Retirer de ma liste and calls the handler', async () => {
    const { user, handlers } = await openKebab({ isLoggedIn: true, inWatchlist: true });

    await user.click(screen.getByRole('menuitem', { name: 'Retirer de ma liste' }));

    expect(handlers.onToggleWatchlist).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Ajouter à ma liste' })).toBeNull();
  });

  it('row layout keeps the kebab on a hover-capable device', () => {
    renderCard({ layout: 'row', hasHover: true, isLoggedIn: true });

    expect(kebabTrigger()).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
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
