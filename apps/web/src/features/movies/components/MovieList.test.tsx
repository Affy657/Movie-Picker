import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieList from '@/features/movies/components/MovieList';
import type { MovieData } from '@/shared/types/movie';

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
    render(
      <MovieList
        movies={[]}
        slug="s"
        allowedReactionIds={[]}
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onReactionError={vi.fn()}
      />
    );
    expect(screen.getByText(/aucun film proposé/i)).toBeInTheDocument();
  });

  it('affiche la liste des films avec titre et score', () => {
    render(
      <MovieList
        movies={movies}
        slug="s"
        allowedReactionIds={[]}
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onReactionError={vi.fn()}
      />
    );
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(screen.getByText(/Proposé par Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Proposé par Bob/)).toBeInTheDocument();
  });

  it('affiche l’indication déjà vu par d’autres lorsque les agrégats le permettent', () => {
    const withSeen: MovieData[] = [
      {
        ...movies[0]!,
        proposerPseudo: 'Charlie',
        reactions: [{ reactionId: 'already_seen', count: 2, pseudos: ['Alice', 'Bob'] }],
      },
    ];
    render(
      <MovieList
        movies={withSeen}
        slug="s"
        allowedReactionIds={[]}
        participantId="p0"
        participantPseudo="Bob"
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onReactionError={vi.fn()}
      />
    );
    expect(screen.getByText(/Déjà vu par d'autres/i)).toBeInTheDocument();
    expect(screen.getByText(/Déjà vu par d'autres : Alice/)).toBeInTheDocument();
  });

  it('affiche les boutons vote up/down quand pas terminé et participantId', async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    render(
      <MovieList
        movies={movies}
        slug="s"
        allowedReactionIds={[]}
        participantId="p0"
        participantPseudo={null}
        isFinished={false}
        onVote={onVote}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onReactionError={vi.fn()}
      />
    );
    const upButtons = screen.getAllByRole('button', { name: /^Voter pour / });
    await userEvent.click(upButtons[0]!);
    expect(onVote).toHaveBeenCalledWith('m1', 1);
  });
});
