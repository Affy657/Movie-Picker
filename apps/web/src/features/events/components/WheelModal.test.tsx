import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MovieData } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';
import WheelModal, { confettiPalettes } from './WheelModal';

vi.mock('canvas-confetti', () => ({
  default: Object.assign(vi.fn(), {
    create: vi.fn(() => vi.fn()),
  }),
}));
vi.mock('./SpinningWheel', () => ({
  default: ({ onDone }: { onDone: () => void }) => (
    <button data-testid="spin-done-trigger" onClick={onDone}>
      Fin de roue
    </button>
  ),
}));
vi.mock('@/features/movies/components/WatchProviderChips', () => ({
  default: ({ providers }: { providers: unknown[] }) => (
    <div data-testid="provider-chips">{providers.length} providers</div>
  ),
}));

const baseMovie: MovieData = {
  id: 'm1',
  eventId: 'e1',
  participantId: 'p1',
  tmdbId: 1,
  title: 'Interstellar',
  year: '2014',
  posterPath: null,
  proposerPseudo: 'Alice',
  score: 0,
  up: 0,
  down: 0,
};

const movies: MovieData[] = [baseMovie];

function wrap(ui: ReactNode) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

function wheelDialog(): HTMLDialogElement {
  const dialog = document.querySelector('dialog');
  if (!dialog) throw new Error('No wheel dialog rendered');
  return dialog;
}

function pressEscape(dialog: HTMLDialogElement) {
  const cancel = new Event('cancel', { cancelable: true });
  dialog.dispatchEvent(cancel);
  if (!cancel.defaultPrevented) dialog.close();
}

describe('WheelModal', () => {
  it('cannot be dismissed while the wheel spins, so the winner is not announced early', () => {
    const onClose = vi.fn();
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={onClose}
      />
    );
    const dialog = wheelDialog();

    pressEscape(dialog);
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute('open');
  });

  it('shows the wheel again when the browser closes it anyway during the spin', () => {
    const onClose = vi.fn();
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={onClose}
      />
    );
    const dialog = wheelDialog();

    dialog.close();

    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute('open');
  });

  it('closes once, on Escape or on the backdrop, when the winner is shown', () => {
    const onClose = vi.fn();
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));

    fireEvent.click(wheelDialog());
    expect(onClose).toHaveBeenCalledOnce();

    pressEscape(wheelDialog());
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("affiche le titre 'Tirage en cours' tant que la roue tourne", () => {
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/tirage en cours/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /c'est parti/i })).not.toBeInTheDocument();
  });

  it('affiche le titre gagnant et le film apres la fin de la roue', () => {
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));
    expect(screen.getByText(/film sélectionné/i)).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
    expect(screen.getByText('2014')).toBeInTheDocument();
  });

  it('appelle onClose quand on clique sur le bouton de fermeture', () => {
    const onClose = vi.fn();
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));
    fireEvent.click(screen.getByRole('button', { name: /c'est parti/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('affiche les plateformes streaming si watchProviders present', () => {
    const movieWithProviders: MovieData = {
      ...baseMovie,
      watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
    };
    wrap(
      <WheelModal
        open
        movies={[movieWithProviders]}
        winnerIndex={0}
        winner={movieWithProviders}
        wheelKey={1}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));
    expect(screen.getByTestId('provider-chips')).toBeInTheDocument();
  });

  it("n'affiche pas les chips si watchProviders absent", () => {
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));
    expect(screen.queryByTestId('provider-chips')).not.toBeInTheDocument();
  });

  it('makes the next draw the primary action as long as a slot remains', () => {
    const onRelaunch = vi.fn();
    const onClose = vi.fn();
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={onClose}
        onRelaunch={onRelaunch}
        winnerCount={3}
        remainingDraws={2}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));

    expect(screen.getByRole('heading', { name: /film 1 sur 3 sélectionné/i })).toBeInTheDocument();
    expect(screen.getByText(/encore 2 films à tirer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /c'est parti/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /terminer ici/i }));
    expect(onClose).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: /tirer le suivant/i }));
    expect(onRelaunch).toHaveBeenCalledOnce();
  });

  it(`goes back to "Let's go" without a possible rerun`, () => {
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
        winnerCount={3}
        remainingDraws={0}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));

    expect(screen.getByRole('heading', { name: /film 3 sur 3 sélectionné/i })).toBeInTheDocument();
    expect(screen.queryByText(/à tirer/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tirer le suivant/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /c'est parti/i })).toBeInTheDocument();
  });

  it('keeps the title simple for a single-winner movie night', () => {
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));

    expect(screen.getByRole('heading', { name: /^film sélectionné/i })).toBeInTheDocument();
  });

  it("remet l'etat a spinning quand wheelKey change", () => {
    const { rerender } = wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));
    expect(screen.getByText(/film sélectionné/i)).toBeInTheDocument();

    rerender(
      <LocaleProvider>
        <WheelModal
          open
          movies={movies}
          winnerIndex={0}
          winner={baseMovie}
          wheelKey={2}
          onClose={vi.fn()}
        />
      </LocaleProvider>
    );
    expect(screen.getByText(/tirage en cours/i)).toBeInTheDocument();
  });

  it('skipSpin: reveals the winner straight away with the "picked by the host" title', () => {
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
        skipSpin
      />
    );
    expect(screen.queryByText(/tirage en cours/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('spin-done-trigger')).not.toBeInTheDocument();
    expect(screen.getByText(/choisi par l.hôte/i)).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
  });

  it('calls onSpinComplete at the end of the rotation', () => {
    const onSpinComplete = vi.fn();
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
        onSpinComplete={onSpinComplete}
      />
    );
    expect(onSpinComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('spin-done-trigger'));
    expect(onSpinComplete).toHaveBeenCalledOnce();
  });

  it('skipSpin : appelle onSpinComplete sans attendre la rotation', () => {
    const onSpinComplete = vi.fn();
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
        onSpinComplete={onSpinComplete}
        skipSpin
      />
    );
    expect(onSpinComplete).toHaveBeenCalledOnce();
  });

  it("skipSpin : n'appelle onSpinComplete qu'une fois si le parent rerend", () => {
    const onSpinComplete = vi.fn();
    const { rerender } = wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
        onSpinComplete={onSpinComplete}
        skipSpin
      />
    );
    expect(onSpinComplete).toHaveBeenCalledOnce();

    rerender(
      <LocaleProvider>
        <WheelModal
          open
          movies={movies}
          winnerIndex={0}
          winner={baseMovie}
          wheelKey={1}
          onClose={vi.fn()}
          onSpinComplete={() => onSpinComplete()}
          skipSpin
        />
      </LocaleProvider>
    );
    expect(onSpinComplete).toHaveBeenCalledOnce();
  });
});

describe('confettiPalettes', () => {
  it('splits the wheel colours between the two side bursts', () => {
    const colors = Array.from({ length: 12 }, (_, index) => `c${index}`);
    expect(confettiPalettes(colors)).toEqual({
      burst: colors,
      left: colors.slice(0, 6),
      right: colors.slice(6),
    });
  });

  it('never hands an empty palette to a side burst', () => {
    expect(confettiPalettes(['a'])).toEqual({ burst: ['a'], left: ['a'], right: ['a'] });
    expect(confettiPalettes(['a', 'b', 'c'])).toEqual({
      burst: ['a', 'b', 'c'],
      left: ['a', 'b'],
      right: ['c'],
    });
  });

  it('lets canvas-confetti pick its own colours when no token resolves', () => {
    expect(confettiPalettes([])).toEqual({ burst: undefined, left: undefined, right: undefined });
  });
});
