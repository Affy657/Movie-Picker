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
}

describe('CardKebab', () => {
  it('propose Letterboxd en un clic quand seul ce lien externe est affiché', async () => {
    await openKebab('letterboxd');

    const letterboxd = screen.getByRole('menuitem', { name: /letterboxd/i });
    expect(letterboxd).toHaveAttribute('href', 'https://letterboxd.com/tmdb/438631/');
    expect(screen.queryByRole('menuitem', { name: /imdb/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /allociné/i })).toBeNull();
  });

  it('affiche tous les liens externes par défaut', async () => {
    await openKebab();

    expect(screen.getByRole('menuitem', { name: /letterboxd/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /imdb/i })).toBeInTheDocument();
  });
});
