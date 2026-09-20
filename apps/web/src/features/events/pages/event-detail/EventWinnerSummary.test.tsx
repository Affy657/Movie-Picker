import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import EventWinnerSummary, {
  type WinnerRatingContext,
} from '@/features/events/pages/event-detail/EventWinnerSummary';
import { LocaleProvider } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';

const participants = [
  { id: 'p1', pseudo: 'Alice', avatarId: 'alpha' },
  { id: 'p2', pseudo: 'Bob', avatarId: 'beta' },
  { id: 'p3', pseudo: 'Chloé', avatarId: 'gamma' },
];

function ratingContext(overrides: Partial<WinnerRatingContext> = {}): WinnerRatingContext {
  return {
    scale: 'five',
    participants,
    currentParticipantId: 'p1',
    saving: false,
    error: null,
    onSave: vi.fn().mockResolvedValue(true),
    onClear: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function movie(overrides: Partial<MovieData>): MovieData {
  return {
    id: 'm1',
    eventId: 'evt1',
    participantId: 'p1',
    tmdbId: 1,
    mediaType: 'movie',
    title: 'Matrix',
    year: '1999',
    posterPath: null,
    proposerPseudo: 'Alice',
    score: 0,
    up: 0,
    down: 0,
    voteAverage: 8.3,
    runtimeMinutes: 136,
    ...overrides,
  };
}

function renderSummary(ui: React.ReactElement) {
  return render(
    <LocaleProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </LocaleProvider>
  );
}

describe('EventWinnerSummary', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('renders nothing without a winner', () => {
    const { container } = renderSummary(<EventWinnerSummary winners={[]} isFinished />);
    expect(container).toBeEmptyDOMElement();
  });

  it('presents the single movie of a finished night with its facts and proposer', () => {
    renderSummary(<EventWinnerSummary winners={[movie({})]} isFinished />);
    expect(screen.getByRole('heading', { name: 'Le film de la soirée' })).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText('2h16')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('numbers several winners in draw order and keeps the night open when not finished', () => {
    renderSummary(
      <EventWinnerSummary
        winners={[movie({ id: 'm2', title: 'Alien' }), movie({ id: 'm1', title: 'Matrix' })]}
        isFinished={false}
      />
    );
    expect(screen.getByRole('heading', { name: 'Ce soir, vous regardez' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Alien');
    expect(items[0]).toHaveTextContent('1');
    expect(items[1]).toHaveTextContent('Matrix');
    expect(items[1]).toHaveTextContent('2');
  });

  describe('ratings of a finished night', () => {
    it('invites a participant who has not rated yet and hides the group line while nobody rated', () => {
      renderSummary(
        <EventWinnerSummary winners={[movie({})]} isFinished rating={ratingContext()} />
      );

      expect(screen.getByRole('button', { name: 'Noter ce film' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Voir les notes/ })).not.toBeInTheDocument();
    });

    it('shows my rating in my scale and the group average with the raters', () => {
      const rated = movie({
        ratings: [
          { participantId: 'p1', value: 7, updatedAt: '2026-09-20T10:00:00Z' },
          { participantId: 'p2', value: 9, updatedAt: '2026-09-20T10:00:00Z' },
        ],
      });
      renderSummary(<EventWinnerSummary winners={[rated]} isFinished rating={ratingContext()} />);

      expect(screen.getByRole('button', { name: 'Votre note 3,5/5' })).toBeInTheDocument();
      const group = screen.getByRole('button', { name: 'Voir les notes, moyenne 4,0/5, 2 notes' });
      expect(group).toHaveTextContent('4,0/5');
      expect(group).toHaveTextContent('2 notes');
    });

    it('reads the ten scale', () => {
      const rated = movie({
        ratings: [{ participantId: 'p1', value: 7, updatedAt: '2026-09-20T10:00:00Z' }],
      });
      renderSummary(
        <EventWinnerSummary winners={[rated]} isFinished rating={ratingContext({ scale: 'ten' })} />
      );

      expect(screen.getByRole('button', { name: 'Votre note 7/10' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Voir les notes, moyenne 7,0/10, 1 note' })
      ).toBeInTheDocument();
    });

    it('lets a visitor read the ratings without rating', () => {
      const rated = movie({
        ratings: [{ participantId: 'p2', value: 9, updatedAt: '2026-09-20T10:00:00Z' }],
      });
      renderSummary(
        <EventWinnerSummary
          winners={[rated]}
          isFinished
          rating={ratingContext({ currentParticipantId: null })}
        />
      );

      expect(screen.queryByRole('button', { name: 'Noter ce film' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Voir les notes/ })).toBeInTheDocument();
    });

    it('shows nothing about ratings before the night is over', () => {
      const rated = movie({
        ratings: [{ participantId: 'p2', value: 9, updatedAt: '2026-09-20T10:00:00Z' }],
      });
      renderSummary(
        <EventWinnerSummary winners={[rated]} isFinished={false} rating={ratingContext()} />
      );

      expect(screen.queryByRole('button', { name: 'Noter ce film' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Voir les notes/ })).not.toBeInTheDocument();
    });

    it('opens the rating dialog, saves the picked stars for that movie and closes it', async () => {
      const context = ratingContext();
      renderSummary(
        <EventWinnerSummary winners={[movie({ id: 'm-win' })]} isFinished rating={context} />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Noter ce film' }));
      const dialog = screen.getByRole('dialog', { name: 'Noter ce film' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Noter 4 étoiles' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

      expect(context.onSave).toHaveBeenCalledWith('m-win', 8);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('keeps a failure from an earlier attempt out of a freshly opened dialog', async () => {
      const context = ratingContext({
        error: 'Votre note n’a pas été enregistrée. Réessayez.',
        onSave: vi.fn().mockResolvedValue(false),
      });
      renderSummary(<EventWinnerSummary winners={[movie({})]} isFinished rating={context} />);

      await userEvent.click(screen.getByRole('button', { name: 'Noter ce film' }));
      const dialog = screen.getByRole('dialog', { name: 'Noter ce film' });
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Noter 4 étoiles' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Réessayez');
    });

    it('opens the group list from the average, with who has not rated yet', async () => {
      const rated = movie({
        ratings: [{ participantId: 'p2', value: 9, updatedAt: '2026-09-20T10:00:00Z' }],
      });
      renderSummary(<EventWinnerSummary winners={[rated]} isFinished rating={ratingContext()} />);

      await userEvent.click(screen.getByRole('button', { name: /Voir les notes/ }));

      const dialog = screen.getByRole('dialog');
      const items = within(dialog).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(within(items[0]!).getByText('Vous')).toBeInTheDocument();
      expect(within(items[0]!).getByText('Pas encore noté')).toBeInTheDocument();
      expect(within(items[1]!).getByText('Bob')).toBeInTheDocument();
      expect(within(items[1]!).getByText('4,5/5')).toBeInTheDocument();
      expect(within(items[2]!).getByText('Chloé')).toBeInTheDocument();
    });
  });
});
