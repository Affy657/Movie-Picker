import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventWheelActions from '@/features/events/components/EventWheelActions';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { LocaleProvider } from '@/shared/i18n';
import {
  eventHeaderActions,
  type EventHeaderActionsInput,
} from '@/features/events/lib/eventHeaderActions';

function wheelState(overrides: Partial<EventWheelState> = {}): EventWheelState {
  return {
    isHost: true,
    winnerIds: [],
    spinWinner: null,
    spinPool: [],
    spinWeights: [],
    winnerIndex: -1,
    wheelKey: 0,
    loading: false,
    error: null,
    isModalOpen: false,
    canSpin: true,
    spinDisabled: false,
    spinDisabledHint: null,
    remainingDraws: 1,
    winnerCount: 1,
    primaryAction: 'spin',
    showRemoveWinner: false,
    showReset: false,
    canRelaunchFromModal: false,
    wheelLocked: false,
    launch: vi.fn(),
    reset: vi.fn(),
    dismissModal: vi.fn(),
    revealWinner: vi.fn(),
    manualReveal: false,
    manualMode: false,
    removalMode: false,
    drawableMovies: [],
    enterManualMode: vi.fn(),
    cancelManualMode: vi.fn(),
    pickWinnerManually: vi.fn(),
    enterRemovalMode: vi.fn(),
    cancelRemovalMode: vi.fn(),
    removeWinner: vi.fn(),
    noMovie: false,
    ...overrides,
  };
}

function planFor(wheel: EventWheelState, overrides: Partial<EventHeaderActionsInput> = {}) {
  return eventHeaderActions({
    isHost: wheel.isHost,
    isFinished: false,
    lifecycle: 'upcoming',
    canAddMovie: true,
    canSpin: wheel.canSpin,
    noMovie: wheel.noMovie,
    hasWinner: wheel.winnerIds.length > 0,
    remainingDraws: wheel.remainingDraws,
    canRemoveWinner: wheel.showRemoveWinner,
    canReset: wheel.showReset,
    canCloseWithoutMovie: false,
    canRate: false,
    ...overrides,
  });
}

type Handlers = {
  onAddMovie: () => void;
  onRequestReset: () => void;
  onRequestCloseWithoutMovie: () => void;
  onRate: () => void;
};

function renderActions(
  wheel: EventWheelState,
  overrides: Partial<EventHeaderActionsInput> = {}
): Handlers {
  const handlers: Handlers = {
    onAddMovie: vi.fn(),
    onRequestReset: vi.fn(),
    onRequestCloseWithoutMovie: vi.fn(),
    onRate: vi.fn(),
  };
  render(
    <LocaleProvider>
      <EventWheelActions wheel={wheel} plan={planFor(wheel, overrides)} {...handlers} />
    </LocaleProvider>
  );
  return handlers;
}

function buttonNames(): string[] {
  return screen
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent ?? '');
}

describe('EventWheelActions', () => {
  it('offers to propose first, then the wheel, before any draw', () => {
    renderActions(wheelState());

    expect(buttonNames()).toEqual([
      'Lancer la roue',
      'Autre façon de choisir le film',
      'Proposer un film',
    ]);
  });

  it('opens the manual pick from the arrow of the wheel button', async () => {
    const enterManualMode = vi.fn();
    renderActions(wheelState({ enterManualMode }));

    await userEvent.click(screen.getByRole('button', { name: 'Autre façon de choisir le film' }));
    const menu = screen.getByRole('menu', { name: 'Autre façon de choisir le film' });
    expect(menu).toHaveTextContent('Lancer la roue');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Choisir moi-même' }));

    expect(enterManualMode).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('spins the wheel from the main part of the button', async () => {
    const launch = vi.fn();
    renderActions(wheelState({ launch }));

    await userEvent.click(screen.getByRole('button', { name: 'Lancer la roue' }));

    expect(launch).toHaveBeenCalledOnce();
  });

  it('makes the next draw the last and main button once a winner is drawn', () => {
    renderActions(
      wheelState({
        winnerIds: ['m1'],
        remainingDraws: 2,
        winnerCount: 3,
        showRemoveWinner: true,
        showReset: true,
      })
    );

    expect(buttonNames()).toEqual([
      'Gérer le tirage',
      'Proposer un film',
      'Tirer un film de plus, 2 tirages restants',
      'Autre façon de choisir le film',
    ]);
    expect(
      screen.getByRole('button', { name: 'Tirer un film de plus, 2 tirages restants' })
    ).toHaveTextContent(/2\s*restants/);
  });

  it('puts no badge on a single-winner movie night', () => {
    renderActions(wheelState({ remainingDraws: 1, winnerCount: 1 }));

    expect(screen.getByRole('button', { name: 'Lancer la roue' })).not.toHaveTextContent(/1/);
  });

  it('hides the draw buttons as long as no movie is proposed', () => {
    renderActions(
      wheelState({
        noMovie: true,
        spinDisabled: true,
        spinDisabledHint: 'Proposez au moins un film pour lancer la roue.',
      })
    );

    expect(buttonNames()).toEqual(['Proposer un film']);
  });

  it('says the movie is chosen once every draw is done, without a main button', () => {
    renderActions(
      wheelState({
        winnerIds: ['m1'],
        remainingDraws: 0,
        winnerCount: 1,
        spinDisabled: true,
        spinDisabledHint: 'Le film gagnant est déjà désigné.',
        showRemoveWinner: true,
        showReset: true,
      })
    );

    expect(screen.getByRole('status')).toHaveTextContent('Film choisi');
    expect(buttonNames()).toEqual(['Gérer le tirage', 'Proposer un film']);
  });

  it('counts the chosen movies of a multi-winner night', () => {
    renderActions(
      wheelState({
        winnerIds: ['m1', 'm2', 'm3'],
        remainingDraws: 0,
        winnerCount: 3,
        spinDisabled: true,
        showRemoveWinner: true,
        showReset: true,
      })
    );

    expect(screen.getByRole('status')).toHaveTextContent('3 films choisis');
  });

  it('disables the draw and carries the reason in a tooltip', () => {
    renderActions(
      wheelState({
        spinDisabled: true,
        spinDisabledHint: 'Tous les films proposés ont déjà été tirés.',
      })
    );

    const button = screen.getByRole('button', { name: /lancer la roue/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Tous les films proposés ont déjà été tirés.');
  });

  it('arms the removal mode from the draw menu', async () => {
    const enterRemovalMode = vi.fn();
    renderActions(
      wheelState({ winnerIds: ['m1'], showRemoveWinner: true, showReset: true, enterRemovalMode })
    );

    await userEvent.click(screen.getByRole('button', { name: 'Gérer le tirage' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Retirer un gagnant' }));

    expect(enterRemovalMode).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('asks for confirmation before starting over, from the draw menu', async () => {
    const wheel = wheelState({ winnerIds: ['m1'], showRemoveWinner: true, showReset: true });
    const { onRequestReset } = renderActions(wheel);

    await userEvent.click(screen.getByRole('button', { name: 'Gérer le tirage' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Repartir de zéro' }));

    expect(onRequestReset).toHaveBeenCalledOnce();
  });

  it('closes a pending night without a movie from the draw menu', async () => {
    const { onRequestCloseWithoutMovie } = renderActions(wheelState(), {
      lifecycle: 'pending',
      canCloseWithoutMovie: true,
    });

    expect(buttonNames()).toEqual([
      'Gérer le tirage',
      'Proposer un film',
      'Lancer la roue',
      'Autre façon de choisir le film',
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Gérer le tirage' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Clôturer sans film' }));

    expect(onRequestCloseWithoutMovie).toHaveBeenCalledOnce();
  });

  it('makes rating the main action once the movie can be rated', async () => {
    const { onRate } = renderActions(
      wheelState({ winnerIds: ['m1'], remainingDraws: 0, showRemoveWinner: true, showReset: true }),
      { lifecycle: 'live', canRate: true }
    );

    expect(buttonNames()).toEqual(['Gérer le tirage', 'Proposer un film', 'Noter ce film']);
    await userEvent.click(screen.getByRole('button', { name: 'Noter ce film' }));

    expect(onRate).toHaveBeenCalledOnce();
  });

  it('replaces the bar with the removal hint in removal mode', () => {
    renderActions(wheelState({ removalMode: true, canSpin: false, winnerIds: ['m1'] }));

    expect(screen.getByText(/choisissez le film gagnant à retirer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lancer la roue/i })).not.toBeInTheDocument();
  });

  it('leaves the removal mode with Cancel', async () => {
    const cancelRemovalMode = vi.fn();
    renderActions(
      wheelState({ removalMode: true, canSpin: false, winnerIds: ['m1'], cancelRemovalMode })
    );

    await userEvent.click(screen.getByRole('button', { name: /annuler/i }));

    expect(cancelRemovalMode).toHaveBeenCalledOnce();
  });

  it('shows the manual pick hint in manual mode', () => {
    renderActions(wheelState({ manualMode: true, canSpin: false }));

    expect(screen.getByText(/choisissez le film à désigner gagnant/i)).toBeInTheDocument();
  });

  it('renders nothing for a guest who cannot do anything', () => {
    const wheel = wheelState({ isHost: false, canSpin: false, primaryAction: null });
    const { container } = render(
      <LocaleProvider>
        <EventWheelActions
          wheel={wheel}
          plan={planFor(wheel, { canAddMovie: false })}
          onRequestReset={vi.fn()}
          onRequestCloseWithoutMovie={vi.fn()}
        />
      </LocaleProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
