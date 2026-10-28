import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('puts the given action in the heading row, next to the title', () => {
    renderSummary(
      <EventWinnerSummary
        winners={[movie({})]}
        isFinished
        action={<a href="/r/soiree">Voir le recap</a>}
      />
    );
    const card = screen.getByRole('region', { name: 'Le film de la soirée' });
    expect(within(card).getByRole('link', { name: 'Voir le recap' })).toHaveAttribute(
      'href',
      '/r/soiree'
    );
  });

  it('lets the caller draw the rating area of each movie', () => {
    renderSummary(
      <EventWinnerSummary
        winners={[movie({}), movie({ id: 'm2', title: 'Heat' })]}
        isFinished
        rating={ratingContext()}
        renderRating={(item) => <p>Notes de {item.title}</p>}
      />
    );
    expect(screen.getByText('Notes de Matrix')).toBeInTheDocument();
    expect(screen.getByText('Notes de Heat')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Noter ce film' })).not.toBeInTheDocument();
  });

  function isoInDays(days: number): string {
    const day = new Date();
    day.setDate(day.getDate() + days);
    return [
      day.getFullYear(),
      String(day.getMonth() + 1).padStart(2, '0'),
      String(day.getDate()).padStart(2, '0'),
    ].join('-');
  }

  it('says tonight on the day of the night', () => {
    renderSummary(
      <EventWinnerSummary winners={[movie({})]} isFinished={false} date={isoInDays(0)} />
    );

    expect(screen.getByRole('heading', { name: 'Ce soir, vous regardez' })).toBeInTheDocument();
  });

  it('says tomorrow the day before the night', () => {
    renderSummary(
      <EventWinnerSummary winners={[movie({})]} isFinished={false} date={isoInDays(1)} />
    );

    expect(screen.getByRole('heading', { name: 'Demain, vous regardez' })).toBeInTheDocument();
  });

  it('names a later night by its date', () => {
    renderSummary(
      <EventWinnerSummary winners={[movie({})]} isFinished={false} date="2035-06-03" />
    );

    expect(
      screen.getByRole('heading', { name: 'Le 3 juin 2035, vous regardez' })
    ).toBeInTheDocument();
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
      expect(screen.getByText('Moyenne 4,0/5, 2 notes')).toBeInTheDocument();
    });

    it('gives a participant a single button into the ratings', () => {
      const rated = movie({
        ratings: [
          { participantId: 'p1', value: 7, updatedAt: '2026-09-20T10:00:00Z' },
          { participantId: 'p2', value: 9, updatedAt: '2026-09-20T10:00:00Z' },
        ],
      });
      renderSummary(<EventWinnerSummary winners={[rated]} isFinished rating={ratingContext()} />);

      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.queryByRole('button', { name: /Voir les notes/ })).not.toBeInTheDocument();
    });

    it('reads the ten scale', () => {
      const rated = movie({
        ratings: [{ participantId: 'p1', value: 7, updatedAt: '2026-09-20T10:00:00Z' }],
      });
      renderSummary(
        <EventWinnerSummary winners={[rated]} isFinished rating={ratingContext({ scale: 'ten' })} />
      );

      expect(screen.getByRole('button', { name: 'Votre note 7/10' })).toBeInTheDocument();
      expect(screen.getByText('Moyenne 7,0/10, 1 note')).toBeInTheDocument();
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
      expect(
        screen.getByRole('button', { name: 'Voir les notes, moyenne 4,5/5, 1 note' })
      ).toBeInTheDocument();
    });

    it('lets a participant rate while the night is underway', () => {
      renderSummary(
        <EventWinnerSummary
          winners={[movie({})]}
          isFinished={false}
          ratingOpen
          rating={ratingContext()}
        />
      );

      expect(screen.getByRole('button', { name: 'Noter ce film' })).toBeInTheDocument();
    });

    it('invites someone signed out to sign in to rate that movie', () => {
      renderSummary(
        <EventWinnerSummary
          winners={[movie({ id: 'm-win' })]}
          isFinished
          rating={ratingContext({
            currentParticipantId: null,
            signInHref: (movieId) => `/login?returnTo=%2Fe%2Fsoiree%3Frate%3D${movieId}`,
          })}
        />
      );

      expect(screen.getByRole('link', { name: 'Se connecter pour noter' })).toHaveAttribute(
        'href',
        '/login?returnTo=%2Fe%2Fsoiree%3Frate%3Dm-win'
      );
      expect(screen.queryByRole('button', { name: 'Noter ce film' })).not.toBeInTheDocument();
    });

    it('offers the next drawn movie not rated yet once a rating is saved', async () => {
      renderSummary(
        <EventWinnerSummary
          winners={[movie({ id: 'm1', title: 'Matrix' }), movie({ id: 'm2', title: 'Alien' })]}
          isFinished
          rating={ratingContext()}
        />
      );

      await userEvent.click(screen.getAllByRole('button', { name: 'Noter ce film' })[0]!);
      const first = screen.getByRole('dialog', { name: 'Noter ce film' });
      expect(within(first).getByText('Matrix')).toBeInTheDocument();
      await userEvent.click(within(first).getByRole('button', { name: 'Noter 4 étoiles' }));
      await userEvent.click(within(first).getByRole('button', { name: 'Enregistrer' }));

      await waitFor(() =>
        expect(
          within(screen.getByRole('dialog', { name: 'Noter ce film' })).getByText('Alien')
        ).toBeInTheDocument()
      );
    });

    it('stops once every drawn movie carries my rating', async () => {
      const context = ratingContext();
      const rated = { participantId: 'p1', value: 6, updatedAt: '2026-09-20T10:00:00Z' };
      renderSummary(
        <EventWinnerSummary
          winners={[
            movie({ id: 'm1', title: 'Matrix' }),
            movie({ id: 'm2', title: 'Alien', ratings: [rated] }),
          ]}
          isFinished
          rating={context}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Noter ce film' }));
      const dialog = screen.getByRole('dialog', { name: 'Noter ce film' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Noter 4 étoiles' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

      expect(context.onSave).toHaveBeenCalledWith('m1', 8);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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

    it('opens the rating dialog of the movie named by the reminder link on arrival, once', () => {
      const onAutoOpen = vi.fn();
      renderSummary(
        <EventWinnerSummary
          winners={[movie({ id: 'm1', title: 'Matrix' }), movie({ id: 'm2', title: 'Alien' })]}
          isFinished
          rating={ratingContext({ autoOpenMovieId: 'm2', onAutoOpen })}
        />
      );

      const dialog = screen.getByRole('dialog', { name: 'Noter ce film' });
      expect(within(dialog).getByText('Alien')).toBeInTheDocument();
      expect(onAutoOpen).toHaveBeenCalledOnce();
    });

    it('opens nothing on arrival when the link names no movie', () => {
      renderSummary(
        <EventWinnerSummary
          winners={[movie({})]}
          isFinished
          rating={ratingContext({ autoOpenMovieId: null, onAutoOpen: vi.fn() })}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('lists the group in the rating dialog, with who has not rated yet', async () => {
      const rated = movie({
        ratings: [{ participantId: 'p2', value: 9, updatedAt: '2026-09-20T10:00:00Z' }],
      });
      renderSummary(<EventWinnerSummary winners={[rated]} isFinished rating={ratingContext()} />);

      await userEvent.click(screen.getByRole('button', { name: 'Noter ce film' }));

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
