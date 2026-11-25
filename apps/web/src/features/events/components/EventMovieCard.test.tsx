import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import MovieList from '@/features/events/components/MovieList';
import { LocaleProvider } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';

const inception: MovieData = {
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
};

function renderCard(movie: Partial<MovieData> = {}, props: Record<string, unknown> = {}) {
  const onVote = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <QueryClientWrapper>
        <LocaleProvider>
          <MovieList
            movies={[{ ...inception, ...movie }]}
            slug="s"
            participantId="p2"
            participantPseudo="Bob"
            isFinished={false}
            onVote={onVote}
            onRemove={vi.fn()}
            refresh={vi.fn()}
            onActionError={vi.fn()}
            isMobile={false}
            viewMode="grid"
            {...props}
          />
        </LocaleProvider>
      </QueryClientWrapper>
    </MemoryRouter>
  );
  return { onVote, card: screen.getByRole('listitem') };
}

const field = (card: HTMLElement, label: string) =>
  within(card).getByText(label).closest('div') as HTMLElement;

describe('EventMovieCard, the film sheet', () => {
  it('names its fields: proposer, score and who has seen it', () => {
    const { card } = renderCard({ seenByPseudos: [] });

    expect(within(field(card, 'Proposé par')).getByText('Alice')).toBeInTheDocument();
    expect(within(field(card, 'Score')).getByText('+2')).toBeInTheDocument();
    expect(within(field(card, 'Déjà vu')).getByText('Personne')).toBeInTheDocument();
  });

  it('names nobody as the proposer of a film proposed anonymously', () => {
    const { card } = renderCard({ proposerPseudo: '', participantId: '', seenByPseudos: [] });

    const proposer = field(card, 'Proposé par');
    expect(within(proposer).getByText('Anonyme')).toBeInTheDocument();
    expect(within(proposer).queryByRole('link')).not.toBeInTheDocument();
  });

  it('lists everyone who has seen the film, me included', () => {
    const { card } = renderCard({ seenByPseudos: ['Bob', 'Alice'] });

    expect(within(field(card, 'Déjà vu')).getByText('Déjà vu par Bob, Alice')).toBeInTheDocument();
  });

  it('writes For and Against in framed vote buttons and fills my vote', async () => {
    const { card, onVote } = renderCard({ myVote: 1 });

    const voteFor = within(card).getByRole('button', { name: /retirer mon vote pour/i });
    expect(voteFor).toHaveTextContent('Pour3');
    expect(voteFor).toHaveAttribute('aria-pressed', 'true');
    const voteAgainst = within(card).getByRole('button', { name: 'Voter contre Inception' });
    expect(voteAgainst).toHaveTextContent('Contre1');

    await userEvent.click(voteAgainst);
    expect(onVote).toHaveBeenCalledWith('m1', -1);
  });

  it('keeps only the icon and the count when the bar is too narrow for the words', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe() {
          this.callback(
            [{ contentRect: { width: 260 } } as ResizeObserverEntry],
            this as unknown as ResizeObserver
          );
        }
        disconnect() {}
      }
    );
    const { card } = renderCard();

    expect(within(card).getByRole('button', { name: 'Voter pour Inception' })).toHaveTextContent(
      /^3$/
    );
    vi.unstubAllGlobals();
  });

  it('toggles my seen mark from an eye button without text', () => {
    const { card } = renderCard();

    const eye = within(card).getByRole('button', { name: 'Marquer « déjà vu » pour Inception' });
    expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(eye).toHaveTextContent('');
  });

  it('reserves no room for the note when there is none', () => {
    const { card } = renderCard({ pitchNote: null });

    expect(within(card).queryByTestId('movie-card-note')).not.toBeInTheDocument();
  });

  it('keeps the note zone when the film has a note', () => {
    const { card } = renderCard({ pitchNote: 'Un casse dans les rêves' });

    expect(within(card).getByTestId('movie-card-note')).toHaveTextContent(
      'Un casse dans les rêves'
    );
  });

  it('shows the vote error in place of the note, with a retry', async () => {
    const onRetryVote = vi.fn();
    const { card } = renderCard(
      { pitchNote: 'Un casse dans les rêves' },
      { voteErrors: { m1: { message: 'Votre vote n’a pas été enregistré.' } }, onRetryVote }
    );

    expect(within(card).getByRole('alert')).toHaveTextContent('Votre vote n’a pas été enregistré.');
    expect(within(card).queryByText('Un casse dans les rêves')).not.toBeInTheDocument();
    await userEvent.click(
      within(card).getByRole('button', { name: 'Réessayer le vote pour Inception' })
    );
    expect(onRetryVote).toHaveBeenCalledWith('m1');
  });

  it('shows the counts without buttons once the night is over', () => {
    const { card } = renderCard({}, { isFinished: true });

    expect(within(card).queryByRole('button', { name: /voter/i })).not.toBeInTheDocument();
    expect(within(card).getByRole('img', { name: /3.*1/ })).toBeInTheDocument();
  });

  it('keeps its menu on a touch screen, where the poster alone opens the film', () => {
    const { card } = renderCard();

    expect(within(card).getByRole('button', { name: /plus d’actions/i })).toBeInTheDocument();
  });

  it('shows cards on a phone, whatever the chosen view', () => {
    renderCard({}, { isMobile: true, viewMode: 'list' });

    expect(screen.getByText('Proposé par')).toBeInTheDocument();
  });
});
