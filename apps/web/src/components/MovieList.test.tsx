import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieList from './MovieList';
import type { MovieData } from '../types/event';

const movies: MovieData[] = [
  {
    _id: 'm1',
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
    _id: 'm2',
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
        participantId={null}
        terminé={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
      />
    );
    expect(screen.getByText(/aucun film proposé/i)).toBeInTheDocument();
  });

  it('affiche la liste des films avec titre et score', () => {
    render(
      <MovieList
        movies={movies}
        participantId={null}
        terminé={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
      />
    );
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(screen.getByText(/Proposé par Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Proposé par Bob/)).toBeInTheDocument();
  });

  it('affiche les boutons vote up/down quand pas terminé et participantId', async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    render(
      <MovieList
        movies={movies}
        participantId="p0"
        terminé={false}
        onVote={onVote}
        onRemove={vi.fn()}
        refresh={vi.fn()}
      />
    );
    const upButtons = screen.getAllByTitle('Upvote');
    await userEvent.click(upButtons[0]!);
    expect(onVote).toHaveBeenCalledWith('m1', 1);
  });
});
