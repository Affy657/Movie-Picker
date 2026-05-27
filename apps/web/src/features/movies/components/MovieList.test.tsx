import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieList from '@/features/movies/components/MovieList';
import type { MovieData } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';

function renderWithLocale(ui: React.ReactElement) {
  return render(
    <QueryClientWrapper>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientWrapper>
  );
}

const movies: MovieData[] = [
  {
    id: 'm1',
    eventId: 'e1',
    participantId: 'p1',
    tmdbId: 1,
    title: 'Inception',
    year: '2010',
    posterPath: null,
    proposerPseudo: 'Alice',
    score: 2,
    up: 3,
    down: 1,
  },
  {
    id: 'm2',
    eventId: 'e1',
    participantId: 'p2',
    tmdbId: 2,
    title: 'Matrix',
    year: '1999',
    posterPath: null,
    proposerPseudo: 'Bob',
    score: -1,
    up: 0,
    down: 1,
  },
];

describe('MovieList', () => {
  it('affiche un placeholder si liste vide', () => {
    renderWithLocale(
      <MovieList
        movies={[]}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText(/aucun film proposé/i)).toBeInTheDocument();
  });

  it('affiche la liste des films avec titre et score', () => {
    renderWithLocale(
      <MovieList
        movies={movies}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(screen.getByTitle('Alice')).toBeInTheDocument();
    expect(screen.getByTitle('Bob')).toBeInTheDocument();
  });

  it('affiche l’indication « déjà vu par d’autres » quand seenByPseudos contient d’autres participants', () => {
    const withSeen: MovieData[] = [
      {
        ...movies[0]!,
        proposerPseudo: 'Charlie',
        seenCount: 2,
        seenByPseudos: ['Alice', 'Bob'],
      },
    ];
    renderWithLocale(
      <MovieList
        movies={withSeen}
        slug="s"
        participantId="p0"
        participantPseudo="Bob"
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText(/Déjà vu par Alice/)).toBeInTheDocument();
  });

  it('affiche la durée formatée (2h28) et la note convertie sur 5 (sans préfixe « TMDB »)', () => {
    const withRuntime: MovieData[] = [
      {
        ...movies[0]!,
        voteAverage: 8.4,
        runtimeMinutes: 148,
      },
    ];
    renderWithLocale(
      <MovieList
        movies={withRuntime}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText(/2h28/)).toBeInTheDocument();
    expect(screen.getByText(/4\.2\/5/)).toBeInTheDocument();
    expect(screen.queryByText(/TMDB\s*\d/)).not.toBeInTheDocument();
  });

  it('affiche les boutons vote up/down + déjà vu quand pas terminé et participantId', async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    renderWithLocale(
      <MovieList
        movies={movies}
        slug="s"
        participantId="p0"
        participantPseudo={null}
        isFinished={false}
        onVote={onVote}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    const upButtons = screen.getAllByRole('button', { name: /^Voter pour / });
    await userEvent.click(upButtons[0]!);
    expect(onVote).toHaveBeenCalledWith('m1', 1);
    expect(screen.getAllByRole('button', { name: /Marquer « déjà vu »/ })).toHaveLength(2);
  });

  it('reflète myVote sur les boutons (aria-pressed) et expose un libellé « retirer » au reclic', () => {
    const voted: MovieData[] = [
      { ...movies[0]!, myVote: 1 },
      { ...movies[1]!, myVote: -1 },
    ];
    renderWithLocale(
      <MovieList
        movies={voted}
        slug="s"
        participantId="p0"
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );

    const upPressed = screen.getByRole('button', { name: /Retirer mon vote pour « Inception »/ });
    expect(upPressed).toHaveAttribute('aria-pressed', 'true');

    const downPressed = screen.getByRole('button', { name: /Retirer mon vote contre « Matrix »/ });
    expect(downPressed).toHaveAttribute('aria-pressed', 'true');

    const upNeutral = screen.getByRole('button', { name: /^Voter pour Matrix/ });
    expect(upNeutral).toHaveAttribute('aria-pressed', 'false');
  });
});
