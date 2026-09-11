import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventWheelActions from '@/features/events/components/EventWheelActions';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { LocaleProvider } from '@/shared/i18n';

function wheelState(overrides: Partial<EventWheelState> = {}): EventWheelState {
  return {
    isHost: true,
    winnerIds: [],
    winners: [],
    spinWinner: null,
    spinPool: [],
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
    launch: vi.fn(),
    reset: vi.fn(),
    dismissModal: vi.fn(),
    revealWinner: vi.fn(),
    pickMethod: null,
    manualReveal: false,
    manualMode: false,
    removalMode: false,
    eligibleMovies: [],
    drawableMovies: [],
    noEligibleMovie: false,
    enterManualMode: vi.fn(),
    cancelManualMode: vi.fn(),
    pickWinnerManually: vi.fn(),
    enterRemovalMode: vi.fn(),
    cancelRemovalMode: vi.fn(),
    removeWinner: vi.fn(),
    ...overrides,
  };
}

function renderActions(wheel: EventWheelState, onRequestReset = vi.fn()) {
  render(
    <LocaleProvider>
      <EventWheelActions wheel={wheel} onRequestReset={onRequestReset} />
    </LocaleProvider>
  );
  return onRequestReset;
}

describe('EventWheelActions', () => {
  it('ne propose plus de clôturer la soirée', () => {
    renderActions(wheelState());

    expect(screen.queryByRole('button', { name: /clôturer/i })).not.toBeInTheDocument();
  });

  it('parle de lancer la roue tant qu’aucun film n’est tiré', () => {
    renderActions(wheelState());

    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeInTheDocument();
  });

  it('parle de tirer un film de plus dès qu’un film est au palmarès', () => {
    renderActions(wheelState({ winnerIds: ['m1'], remainingDraws: 2, winnerCount: 3 }));

    expect(screen.getByRole('button', { name: /tirer un film de plus/i })).toBeInTheDocument();
  });

  it('affiche le nombre de tirages restants sur le bouton principal', () => {
    renderActions(wheelState({ winnerIds: ['m1'], remainingDraws: 2, winnerCount: 3 }));

    expect(screen.getByRole('button', { name: /tirer un film de plus/i })).toHaveTextContent('2');
  });

  it('désactive le tirage et porte la raison en infobulle', () => {
    renderActions(
      wheelState({
        spinDisabled: true,
        spinDisabledHint: 'Tous les films proposés ont déjà été tirés.',
        remainingDraws: 0,
      })
    );

    const button = screen.getByRole('button', { name: /lancer la roue/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Tous les films proposés ont déjà été tirés.');
  });

  it('cache le retrait et la remise à zéro tant qu’il n’y a pas de gagnant', () => {
    renderActions(wheelState());

    expect(screen.queryByRole('button', { name: /retirer un gagnant/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /repartir de zéro/i })).not.toBeInTheDocument();
  });

  it('arme le mode retrait au clic', async () => {
    const enterRemovalMode = vi.fn();
    renderActions(wheelState({ winnerIds: ['m1'], showRemoveWinner: true, enterRemovalMode }));

    await userEvent.click(screen.getByRole('button', { name: /retirer un gagnant/i }));

    expect(enterRemovalMode).toHaveBeenCalledOnce();
  });

  it('demande confirmation avant de repartir de zéro', async () => {
    const onRequestReset = vi.fn();
    renderActions(wheelState({ winnerIds: ['m1'], showReset: true }), onRequestReset);

    await userEvent.click(screen.getByRole('button', { name: /repartir de zéro/i }));

    expect(onRequestReset).toHaveBeenCalledOnce();
  });

  it('remplace la barre par la consigne de retrait en mode retrait', () => {
    renderActions(wheelState({ removalMode: true, canSpin: false, winnerIds: ['m1'] }));

    expect(screen.getByText(/cliquez sur un film gagnant/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lancer la roue/i })).not.toBeInTheDocument();
  });

  it('sort du mode retrait par le bouton Annuler', async () => {
    const cancelRemovalMode = vi.fn();
    renderActions(
      wheelState({ removalMode: true, canSpin: false, winnerIds: ['m1'], cancelRemovalMode })
    );

    await userEvent.click(screen.getByRole('button', { name: /annuler/i }));

    expect(cancelRemovalMode).toHaveBeenCalledOnce();
  });

  it('affiche la consigne de choix manuel en mode manuel', () => {
    renderActions(wheelState({ manualMode: true, canSpin: false }));

    expect(screen.getByText(/cliquez sur un film pour le désigner gagnant/i)).toBeInTheDocument();
  });

  it('ne rend rien pour un participant qui ne peut rien faire', () => {
    const { container } = render(
      <LocaleProvider>
        <EventWheelActions
          wheel={wheelState({ isHost: false, canSpin: false, primaryAction: null })}
          onRequestReset={vi.fn()}
        />
      </LocaleProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
