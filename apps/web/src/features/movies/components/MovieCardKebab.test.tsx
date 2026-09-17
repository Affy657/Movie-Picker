import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardKebab } from '@/features/movies/components/MovieCardKebab';
import { LocaleProvider, useTranslation } from '@/shared/i18n';

function Harness({ externalLinks }: Readonly<{ externalLinks?: 'all' | 'letterboxd' }>) {
  const { t } = useTranslation();
  return (
    <CardKebab
      title="Dune"
      year="2021"
      tmdbId={438631}
      mediaType="movie"
      isMine
      isHost={false}
      canRemove
      onRemove={() => {}}
      onViewDetails={() => {}}
      externalLinks={externalLinks}
      t={t}
    />
  );
}

async function openKebab(externalLinks?: 'all' | 'letterboxd') {
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <Harness externalLinks={externalLinks} />
    </LocaleProvider>
  );
  await user.click(screen.getByRole('button', { name: /plus d’actions/i }));
  return user;
}

describe('CardKebab', () => {
  it('offers Letterboxd in one click when it is the only external link shown', async () => {
    await openKebab('letterboxd');

    const letterboxd = screen.getByRole('menuitem', { name: /letterboxd/i });
    expect(letterboxd).toHaveAttribute('href', 'https://letterboxd.com/tmdb/438631/');
    expect(screen.queryByRole('menuitem', { name: /imdb/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /allociné/i })).toBeNull();
  });

  it('shows every external link by default', async () => {
    await openKebab();

    expect(screen.getByRole('menuitem', { name: /letterboxd/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /imdb/i })).toBeInTheDocument();
  });

  it('is a shared menu: the arrows walk the items, Escape closes and gives the focus back', async () => {
    const user = await openKebab('letterboxd');
    const menu = screen.getByRole('menu', { name: /plus d’actions/i });
    const items = screen.getAllByRole('menuitem');
    expect(menu).toContainElement(items[0]!);

    items[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(items[items.length - 1]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plus d’actions/i })).toHaveFocus();
  });

  it('separates the groups and names the removal after the movie', async () => {
    await openKebab('letterboxd');
    expect(screen.getAllByRole('separator')).toHaveLength(2);
    expect(screen.getByRole('menuitem', { name: /retirer.*dune/i })).toBeInTheDocument();
  });
});
