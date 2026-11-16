import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import MovieBrowseCard, {
  type MovieBrowseCardItem,
} from '@/features/movies/components/MovieBrowseCard';
import showcaseStyles from '@/features/movies/components/ShowcaseMovieCard.module.css';
import rowStyles from '@/features/movies/components/LibraryMovieRow.module.css';
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
    await user.click(screen.getByRole('button', { name: 'Ajouter « Dune » à ma liste' }));
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
    expect(screen.getByRole('button', { name: 'Ajouter « Dune » à ma liste' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /^Proposer « Dune »/ })).toHaveFocus();
  });

  it('in the watchlist: the badge shows at rest and the toggle reads Retirer de ma liste', async () => {
    const user = userEvent.setup();
    const handlers = renderCard({ hasHover: true, isLoggedIn: true, inWatchlist: true });

    expect(screen.getByRole('img', { name: 'Déjà dans votre liste' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retirer « Dune » de ma liste' }));
    expect(handlers.onToggleWatchlist).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Ajouter « Dune » à ma liste' })).toBeNull();
  });

  it('on the watchlist itself: no in-list badge, the toggle still removes the movie', () => {
    renderCard({ hasHover: true, isLoggedIn: true, inWatchlist: true, showListBadge: false });

    expect(screen.queryByRole('img', { name: 'Déjà dans votre liste' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retirer « Dune » de ma liste' })
    ).toBeInTheDocument();
  });

  it('in the watchlist on a touch screen: the badge shows, no action button', () => {
    renderCard({ hasHover: false, isLoggedIn: true, inWatchlist: true });

    expect(screen.getByRole('img', { name: 'Déjà dans votre liste' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retirer « Dune » de ma liste' })).toBeNull();
  });

  it('row layout keeps the kebab on a hover-capable device', () => {
    renderCard({ layout: 'row', hasHover: true, isLoggedIn: true });

    expect(kebabTrigger()).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('row layout in a created list: the kebab takes the movie out of that list', async () => {
    const user = userEvent.setup();
    const onRemoveFromList = vi.fn();
    renderCard({ layout: 'row', hasHover: true, isLoggedIn: true, onRemoveFromList });

    await user.click(kebabTrigger());
    const remove = screen.getByRole('menuitem', { name: 'Retirer « Dune » de la liste' });
    expect(remove).toHaveTextContent('Retirer de la liste');
    await user.click(remove);

    expect(onRemoveFromList).toHaveBeenCalledTimes(1);
  });

  it('row layout outside a created list: the kebab offers no removal', async () => {
    const user = userEvent.setup();
    renderCard({ layout: 'row', hasHover: true, isLoggedIn: true });

    await user.click(kebabTrigger());

    expect(screen.queryByRole('menuitem', { name: /retirer « dune » de la liste/i })).toBeNull();
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
      leadingBadge: <span>Rang 2</span>,
    });

    expect(screen.getByText('Rang 2')).toBeInTheDocument();
    expect(screen.getByText('Série')).toBeInTheDocument();
  });

  it('shows no badge for a plain movie', () => {
    renderCard();

    expect(screen.queryByText('Série')).toBeNull();
  });

  it('dims a watched poster, which still opens the film, keeps its badges and says it is watched', async () => {
    const handlers = renderCard({
      dimmed: true,
      isLoggedIn: true,
      inWatchlist: true,
      leadingBadge: <span>8/10</span>,
    });

    const trigger = screen.getByRole('button', {
      name: 'Voir les détails de « Dune », déjà vu',
    });
    expect(screen.getByRole('listitem').className).toContain(showcaseStyles.dimmed);
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByLabelText('Déjà dans votre liste')).toBeInTheDocument();

    await userEvent.click(trigger);
    expect(handlers.onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('dims a watched row and says it is watched', () => {
    renderCard({ layout: 'row', dimmed: true });

    expect(
      screen.getByRole('button', { name: 'Voir les détails de « Dune », déjà vu' })
    ).toBeInTheDocument();
    expect(screen.getByRole('listitem').className).toContain(rowStyles.dimmed);
  });

  it('row layout names the removal after the collection it leaves', async () => {
    const user = userEvent.setup();
    renderCard({
      layout: 'row',
      hasHover: true,
      isLoggedIn: true,
      onRemoveFromList: vi.fn(),
      removeLabel: 'Retirer des films vus',
      removeAriaLabel: 'Retirer « Dune » des films vus',
    });

    await user.click(kebabTrigger());

    expect(
      screen.getByRole('menuitem', { name: 'Retirer « Dune » des films vus' })
    ).toHaveTextContent('Retirer des films vus');
  });

  it('names the watchlist toggle after the movie', () => {
    renderCard({ hasHover: true, isLoggedIn: true, inWatchlist: false });

    expect(screen.getByRole('button', { name: 'Ajouter « Dune » à ma liste' })).toBeInTheDocument();
  });
});
