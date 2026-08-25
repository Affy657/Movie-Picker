import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WheelSection from '@/features/events/components/WheelSection';
import EventWheelActions from '@/features/events/components/EventWheelActions';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';

vi.mock('./WheelModal', () => ({
  default: ({
    winner,
    skipSpin,
    onRelaunch,
  }: {
    winner: MovieData;
    skipSpin?: boolean;
    onRelaunch?: () => void;
  }) => (
    <div
      data-testid="wheel-modal-mock"
      data-skip-spin={skipSpin ? 'true' : 'false'}
      data-has-relaunch={onRelaunch ? 'true' : 'false'}
    >
      {winner.title}
    </div>
  ),
}));
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

const { postEventWinnerMock, postEventWheelMock } = vi.hoisted(() => ({
  postEventWinnerMock: vi.fn(),
  postEventWheelMock: vi.fn(),
}));
vi.mock('@/features/events/api/eventsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/events/api/eventsApi')>();
  return { ...actual, postEventWinner: postEventWinnerMock, postEventWheel: postEventWheelMock };
});

const baseEvent: EventData = {
  id: 'e1',
  title: 'Soiree',
  date: '2030-01-01',
  time: '20:00',
  slug: 'soiree',
  isHost: false,
  isFinished: false,
  config: {
    theme: null,
    maxProposalsPerParticipant: null,
    maxParticipants: null,
    wheelMode: 'strictRandom',
  },
};

function makeMovies(n: number): MovieData[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    eventId: 'e1',
    participantId: 'p1',
    tmdbId: i + 1,
    title: `Film ${i + 1}`,
    year: '2024',
    posterPath: null,
    proposerPseudo: 'Alice',
    score: 0,
    up: 0,
    down: 0,
  }));
}

type HarnessProps = {
  event: EventData;
  movies: MovieData[];
  hostToken: string | null;
  onRequestReset?: () => void;
};

function WheelHarness({
  event,
  movies,
  hostToken,
  onRequestReset = () => {},
}: Readonly<HarnessProps>) {
  const wheel = useEventWheel({
    slug: 'soiree',
    event,
    movies,
    hostToken,
    onWheelDone: () => {},
    onCloseDone: () => {},
  });
  return (
    <>
      <EventWheelActions wheel={wheel} onRequestReset={onRequestReset} />
      <WheelSection movies={movies} wheel={wheel} />
      {wheel.manualMode && movies[0] && (
        <button type="button" onClick={() => wheel.pickWinnerManually(movies[0]!)}>
          test-select-movie
        </button>
      )}
    </>
  );
}

function renderWheel(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientProvider>
  );
}

describe('WheelSection', () => {
  it("n'affiche pas de section tant qu'aucun film n'est tire, meme pour l'hote", () => {
    const { container } = renderWheel(
      <WheelHarness event={{ ...baseEvent, isHost: true }} movies={makeMovies(1)} hostToken="ht" />
    );
    expect(container.querySelector('section')).toBeNull();
    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeInTheDocument();
  });

  it("n'affiche rien pour un invite sans film tire", () => {
    const { container } = renderWheel(
      <WheelHarness event={baseEvent} movies={makeMovies(3)} hostToken={null} />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('isHost false prime sur un hostToken present', () => {
    const { container } = renderWheel(
      <WheelHarness event={baseEvent} movies={makeMovies(3)} hostToken="stale-token" />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('isHost absent (undefined) + hostToken => actions hote', () => {
    renderWheel(
      <WheelHarness
        event={{ ...baseEvent, isHost: undefined }}
        movies={makeMovies(1)}
        hostToken="ht"
      />
    );
    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeInTheDocument();
  });

  it('desactive Lancer la roue si aucun film', () => {
    renderWheel(
      <WheelHarness event={{ ...baseEvent, isHost: true }} movies={makeMovies(0)} hostToken="ht" />
    );
    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeDisabled();
  });

  it("active le bouton Lancer la roue pour l'hote avec des films", () => {
    renderWheel(
      <WheelHarness event={{ ...baseEvent, isHost: true }} movies={makeMovies(2)} hostToken="ht" />
    );
    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeEnabled();
  });

  const sampleWinner: MovieData = {
    id: 'm1',
    eventId: 'e1',
    participantId: 'p1',
    tmdbId: 1,
    title: 'Inception',
    year: '2010',
    posterPath: null,
    proposerPseudo: 'Alice',
    score: 0,
    up: 0,
    down: 0,
  };

  it('invite : titre resultat du tirage et film gagnant', () => {
    renderWheel(
      <WheelHarness
        event={{ ...baseEvent, winnerMovie: sampleWinner }}
        movies={makeMovies(1)}
        hostToken={null}
      />
    );
    expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument();
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lancer la roue/i })).not.toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });

  it('affiche Relancer, Annuler le tirage et Clôturer pour hote avec gagnant', () => {
    renderWheel(
      <WheelHarness
        event={{ ...baseEvent, isHost: true, winnerMovie: sampleWinner }}
        movies={makeMovies(1)}
        hostToken="ht"
      />
    );
    expect(screen.getByRole('button', { name: /relancer la roue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /annuler le tirage/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clôturer/i })).toBeInTheDocument();
  });

  it('Annuler le tirage appelle onRequestReset au lieu de resetter immédiatement', async () => {
    const onRequestReset = vi.fn();
    renderWheel(
      <WheelHarness
        event={{ ...baseEvent, isHost: true, winnerMovie: sampleWinner }}
        movies={makeMovies(1)}
        hostToken="ht"
        onRequestReset={onRequestReset}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /annuler le tirage/i }));
    expect(onRequestReset).toHaveBeenCalledTimes(1);
  });

  it('met a jour le gagnant quand winnerMovie arrive (polling live)', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = renderWheel(
      <WheelHarness event={baseEvent} movies={makeMovies(1)} hostToken={null} />
    );
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={qc}>
        <LocaleProvider>
          <WheelHarness
            event={{ ...baseEvent, winnerMovie: sampleWinner }}
            movies={makeMovies(1)}
            hostToken={null}
          />
        </LocaleProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });

  it("affiche le badge Choisi par l'hôte quand winnerPickMethod est manual", () => {
    renderWheel(
      <WheelHarness
        event={{ ...baseEvent, winnerMovie: sampleWinner, winnerPickMethod: 'manual' }}
        movies={makeMovies(1)}
        hostToken={null}
      />
    );
    expect(screen.getByText(/choisi par l.hôte/i)).toBeInTheDocument();
  });

  it("n'affiche pas de badge quand winnerPickMethod est wheel", () => {
    renderWheel(
      <WheelHarness
        event={{ ...baseEvent, winnerMovie: sampleWinner, winnerPickMethod: 'wheel' }}
        movies={makeMovies(1)}
        hostToken={null}
      />
    );
    expect(screen.queryByText(/choisi par l.hôte/i)).not.toBeInTheDocument();
  });

  it("affiche le bouton Choisir moi-même pour l'hôte avec des films", () => {
    renderWheel(
      <WheelHarness event={{ ...baseEvent, isHost: true }} movies={makeMovies(2)} hostToken="ht" />
    );
    expect(screen.getByRole('button', { name: /choisir moi-même/i })).toBeInTheDocument();
  });

  it('active puis annule le mode sélection manuelle', async () => {
    renderWheel(
      <WheelHarness event={{ ...baseEvent, isHost: true }} movies={makeMovies(2)} hostToken="ht" />
    );

    await userEvent.click(screen.getByRole('button', { name: /choisir moi-même/i }));
    expect(screen.getByText(/cliquez sur un film pour le désigner gagnant/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /choisir moi-même/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lancer la roue/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^annuler$/i }));
    expect(
      screen.queryByText(/cliquez sur un film pour le désigner gagnant/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choisir moi-même/i })).toBeInTheDocument();
  });

  it('masque « Annuler le tirage » pendant le mode sélection manuelle pour éviter la confusion avec « Annuler »', async () => {
    renderWheel(
      <WheelHarness
        event={{ ...baseEvent, isHost: true, winnerMovie: sampleWinner }}
        movies={makeMovies(2)}
        hostToken="ht"
      />
    );

    expect(screen.getByRole('button', { name: /annuler le tirage/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /choisir moi-même/i }));

    expect(screen.queryByRole('button', { name: /annuler le tirage/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^annuler$/i })).toBeInTheDocument();
  });

  it('sélection manuelle : appelle postEventWinner puis affiche le gagnant sans option de relance', async () => {
    postEventWinnerMock.mockResolvedValueOnce({
      winner: sampleWinner,
      message: "Film choisi par l'hôte.",
    });
    const movies = makeMovies(2);
    renderWheel(
      <WheelHarness event={{ ...baseEvent, isHost: true }} movies={movies} hostToken="ht" />
    );

    await userEvent.click(screen.getByRole('button', { name: /choisir moi-même/i }));
    await userEvent.click(screen.getByRole('button', { name: 'test-select-movie' }));

    expect(postEventWinnerMock).toHaveBeenCalledWith('soiree', 'm0', 'ht');
    expect(await screen.findByTestId('wheel-modal-mock')).toBeInTheDocument();
    expect(screen.getByTestId('wheel-modal-mock')).toHaveAttribute('data-skip-spin', 'true');
    expect(screen.getByTestId('wheel-modal-mock')).toHaveAttribute('data-has-relaunch', 'false');
    expect(screen.getByTestId('wheel-modal-mock')).toHaveTextContent('Inception');
    expect(screen.queryByRole('button', { name: 'test-select-movie' })).not.toBeInTheDocument();
  });

  it('tirage à la roue : la modale reçoit un relaunch et pas de skipSpin', async () => {
    postEventWheelMock.mockResolvedValueOnce({ winner: sampleWinner, message: 'Roue lancée.' });
    renderWheel(
      <WheelHarness event={{ ...baseEvent, isHost: true }} movies={makeMovies(2)} hostToken="ht" />
    );

    await userEvent.click(screen.getByRole('button', { name: /lancer la roue/i }));

    expect(await screen.findByTestId('wheel-modal-mock')).toBeInTheDocument();
    expect(screen.getByTestId('wheel-modal-mock')).toHaveAttribute('data-skip-spin', 'false');
    expect(screen.getByTestId('wheel-modal-mock')).toHaveAttribute('data-has-relaunch', 'true');
    expect(screen.getByRole('region', { name: 'Film 2' })).toBeInTheDocument();
    expect(document.getElementById('event-winner-heading')).toHaveClass('visually-hidden');
  });

  it('tous les films exclus : désactive le tirage et affiche l’aide', () => {
    const excluded = makeMovies(2).map((m) => ({ ...m, excludedFromWheel: true }));
    renderWheel(
      <WheelHarness event={{ ...baseEvent, isHost: true }} movies={excluded} hostToken="ht" />
    );

    const spinButton = screen.getByRole('button', { name: /lancer la roue/i });
    const manualButton = screen.getByRole('button', { name: /choisir moi-même/i });
    expect(spinButton).toBeDisabled();
    expect(manualButton).toBeDisabled();
    expect(spinButton.title).toMatch(/tous les films sont exclus du tirage/i);
    expect(manualButton.title).toMatch(/tous les films sont exclus du tirage/i);
  });

  it('un seul film éligible : le tirage reste possible', () => {
    const [first, second] = makeMovies(2);
    renderWheel(
      <WheelHarness
        event={{ ...baseEvent, isHost: true }}
        movies={[{ ...first!, excludedFromWheel: true }, second!]}
        hostToken="ht"
      />
    );

    const spinButton = screen.getByRole('button', { name: /lancer la roue/i });
    expect(spinButton).toBeEnabled();
    expect(spinButton).not.toHaveAttribute('title');
  });
});
