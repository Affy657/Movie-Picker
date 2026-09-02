import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MovieData } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';
import WheelModal from './WheelModal';

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

describe('WheelModal', () => {
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

  it('affiche le bouton Relancer si onRelaunch fourni et appelle le callback', () => {
    const onRelaunch = vi.fn();
    wrap(
      <WheelModal
        open
        movies={movies}
        winnerIndex={0}
        winner={baseMovie}
        wheelKey={1}
        onClose={vi.fn()}
        onRelaunch={onRelaunch}
      />
    );
    fireEvent.click(screen.getByTestId('spin-done-trigger'));
    const btn = screen.getByRole('button', { name: /relancer la roue/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRelaunch).toHaveBeenCalledOnce();
  });

  it("n'affiche pas le bouton Relancer si onRelaunch absent", () => {
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
    expect(screen.queryByRole('button', { name: /relancer la roue/i })).not.toBeInTheDocument();
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

  it('skipSpin : révèle directement le gagnant avec le titre "choisi par l\'hôte"', () => {
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

  it('appelle onSpinComplete à la fin de la rotation', () => {
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
