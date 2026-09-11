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

  it('annonce les tirages restants dans le nom du bouton et sur le badge', () => {
    renderActions(wheelState({ winnerIds: ['m1'], remainingDraws: 2, winnerCount: 3 }));

    const button = screen.getByRole('button', {
      name: 'Tirer un film de plus, 2 tirages restants',
    });
    expect(button).toHaveTextContent('2');
    expect(button).toHaveTextContent(/restants/);
  });

  it('ne pose pas de badge sur une soirée à un seul gagnant', () => {
    renderActions(wheelState({ remainingDraws: 1, winnerCount: 1 }));

    expect(screen.getByRole('button', { name: 'Lancer la roue' })).not.toHaveTextContent(/1/);
  });

  it('désactive le tirage et porte la raison en infobulle', () => {
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

  it('remplace le bouton de tirage par le palmarès complet quand tout est tiré', () => {
    renderActions(
      wheelState({
        winnerIds: ['m1', 'm2', 'm3'],
        remainingDraws: 0,
        winnerCount: 3,
        spinDisabled: true,
        spinDisabledHint: 'Les 3 films gagnants de la soirée sont déjà désignés.',
        showRemoveWinner: true,
        showReset: true,
      })
    );

    expect(
      screen.queryByRole('button', { name: /tirer un film de plus/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /choisir moi-même/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3 films gagnants désignés');
    expect(screen.getByRole('button', { name: /autres actions sur le tirage/i })).toBeEnabled();
  });

  it('cache le menu du palmarès tant qu’il n’y a pas de gagnant', () => {
    renderActions(wheelState());

    expect(
      screen.queryByRole('button', { name: /autres actions sur le tirage/i })
    ).not.toBeInTheDocument();
  });

  it('arme le mode retrait depuis le menu', async () => {
    const enterRemovalMode = vi.fn();
    renderActions(wheelState({ winnerIds: ['m1'], showRemoveWinner: true, enterRemovalMode }));

    await userEvent.click(screen.getByRole('button', { name: /autres actions sur le tirage/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /retirer un gagnant/i }));

    expect(enterRemovalMode).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('demande confirmation avant de repartir de zéro, depuis le menu', async () => {
    const onRequestReset = vi.fn();
    renderActions(wheelState({ winnerIds: ['m1'], showReset: true }), onRequestReset);

    await userEvent.click(screen.getByRole('button', { name: /autres actions sur le tirage/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /repartir de zéro/i }));

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
