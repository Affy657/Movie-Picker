import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';
import type { EventData } from '@/shared/types/event';
import MovieNightBar from '@/features/events/components/MovieNightBar';
import { useMovieNight } from '@/features/events/hooks/useMovieNight';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

vi.mock('@/features/events/hooks/useMovieNight', () => ({ useMovieNight: vi.fn() }));
vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }));

type Night = ReturnType<typeof useMovieNight>;

const movie: MovieData = {
  id: 'm1',
  eventId: 'e1',
  participantId: 'p2',
  tmdbId: 14306,
  title: 'Marley & moi',
  year: '2008',
  posterPath: null,
  proposerPseudo: 'Léa',
  score: 1,
  up: 1,
  down: 0,
  myVote: 1,
};

const event = {
  id: 'e1',
  title: 'Ciné-club du mercredi',
  date: '2026-11-18',
  time: '21:00',
  slug: 'Ab3x',
  participants: [{ id: 'p2', pseudo: 'Léa', avatarId: null }],
} as unknown as EventData;

function night(overrides: Partial<Night> = {}): Night {
  return {
    event,
    movie,
    loaded: true,
    participant: { participantId: 'p1', pseudo: 'Alice' },
    actionError: null,
    clearActionError: vi.fn(),
    canAct: true,
    canRemove: false,
    canToggleWheel: false,
    iMarkedSeen: false,
    seenPending: false,
    removePending: false,
    vote: vi.fn(),
    toggleSeen: vi.fn().mockResolvedValue(undefined),
    toggleWheel: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function renderBar(props: { onBack?: () => void; onRemoved?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <MovieNightBar
          slug="Ab3x"
          tmdbId={14306}
          mediaType="movie"
          onBack={props.onBack ?? vi.fn()}
          onRemoved={props.onRemoved ?? vi.fn()}
        />
      </LocaleProvider>
    </MemoryRouter>
  );
}

describe('MovieNightBar', () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it('names the night, the proposer and the score, and goes back to the night', async () => {
    const onBack = vi.fn();
    vi.mocked(useMovieNight).mockReturnValue(night());
    renderBar({ onBack });

    const bar = screen.getByRole('region', { name: 'Ce film dans Ciné-club du mercredi' });
    expect(within(bar).getByText('Ciné-club du mercredi')).toBeInTheDocument();
    expect(within(bar).getByText('Proposé par Léa')).toBeInTheDocument();
    expect(within(bar).getByText('+1')).toBeInTheDocument();
    expect(within(bar).getByText('1 pour, 0 contre')).toBeInTheDocument();

    await userEvent.click(
      within(bar).getByRole('button', { name: 'Retour à Ciné-club du mercredi' })
    );
    expect(onBack).toHaveBeenCalled();
  });

  it('votes and marks the film as seen', async () => {
    const state = night();
    vi.mocked(useMovieNight).mockReturnValue(state);
    renderBar();

    expect(screen.getByRole('button', { name: /pour/i, pressed: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /contre/i }));
    expect(state.vote).toHaveBeenCalledWith(-1);
    await userEvent.click(screen.getByRole('button', { name: /déjà vu/i }));
    expect(state.toggleSeen).toHaveBeenCalled();
  });

  it('offers to join the night to a visitor who is not part of it', () => {
    vi.mocked(useMovieNight).mockReturnValue(night({ participant: null, canAct: false }));
    renderBar();

    expect(screen.queryByRole('button', { name: /contre/i })).toBeNull();
    expect(screen.getByRole('link', { name: 'Rejoindre pour voter' })).toHaveAttribute(
      'href',
      '/e/Ab3x'
    );
  });

  it('lets the host exclude the film from the draw and remove it after confirming', async () => {
    const onRemoved = vi.fn();
    const state = night({ canToggleWheel: true, canRemove: true });
    vi.mocked(useMovieNight).mockReturnValue(state);
    renderBar({ onRemoved });

    await userEvent.click(screen.getByRole('button', { name: 'Plus d’actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Exclure du tirage' }));
    expect(state.toggleWheel).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Plus d’actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Retirer' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Retirer le film' }));
    expect(state.remove).toHaveBeenCalled();
    expect(onRemoved).toHaveBeenCalled();
  });

  it('hides the more actions menu when there is nothing to do', () => {
    vi.mocked(useMovieNight).mockReturnValue(night());
    renderBar();

    expect(screen.queryByRole('button', { name: 'Plus d’actions' })).toBeNull();
  });

  it('moves the vote to a bar at the bottom on a phone', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    vi.mocked(useMovieNight).mockReturnValue(night());
    renderBar();

    const bar = screen.getByRole('region', { name: 'Ce film dans Ciné-club du mercredi' });
    expect(within(bar).queryByRole('button', { name: /contre/i })).toBeNull();
    expect(screen.getByRole('button', { name: /contre/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Déjà vu' })).toBeInTheDocument();
  });

  it('says when the film has left the night', () => {
    vi.mocked(useMovieNight).mockReturnValue(night({ movie: null }));
    renderBar();

    expect(screen.getByText('Ce film n’est plus dans Ciné-club du mercredi.')).toBeInTheDocument();
  });

  it('shows an action error that can be dismissed', async () => {
    const state = night({ actionError: 'Suppression impossible' });
    vi.mocked(useMovieNight).mockReturnValue(state);
    renderBar();

    expect(screen.getByRole('alert')).toHaveTextContent('Suppression impossible');
    await userEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(state.clearActionError).toHaveBeenCalled();
  });
});
