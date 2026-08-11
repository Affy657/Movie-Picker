import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WheelSection from '@/features/events/components/WheelSection';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
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
    endDate: null,
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

function renderWheel(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientProvider>
  );
}

describe('WheelSection', () => {
  it("affiche le titre Roue pour l'hote", () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={makeMovies(1)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.getByRole('heading', { name: /roue/i })).toBeInTheDocument();
  });

  it("n'affiche rien pour un invite sans film tire", () => {
    const { container } = renderWheel(
      <WheelSection
        slug="soiree"
        event={baseEvent}
        movies={makeMovies(3)}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('isHost false prime sur un hostToken present', () => {
    const { container } = renderWheel(
      <WheelSection
        slug="soiree"
        event={baseEvent}
        movies={makeMovies(3)}
        hostToken="stale-token"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('isHost absent (undefined) + hostToken => UI hote', () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: undefined }}
        movies={makeMovies(1)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.getByRole('heading', { name: /roue/i })).toBeInTheDocument();
  });

  it('affiche le placeholder si aucun film et hote', () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={makeMovies(0)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.getByText(/aucun film.*proposez/i)).toBeInTheDocument();
  });

  it("affiche le bouton Lancer la roue pour l'hote avec des films", () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={makeMovies(2)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeInTheDocument();
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
      <WheelSection
        slug="soiree"
        event={{
          ...baseEvent,
          winnerMovie: sampleWinner,
        }}
        movies={makeMovies(1)}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.getByRole('heading', { name: /résultat du tirage/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^roue$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });

  it('affiche Relancer + Fermer pour hote avec gagnant', () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true, winnerMovie: sampleWinner }}
        movies={makeMovies(1)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.getByRole('button', { name: /relancer la roue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clôturer/i })).toBeInTheDocument();
  });

  it('met a jour le gagnant quand winnerMovie arrive (polling live)', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = renderWheel(
      <WheelSection
        slug="soiree"
        event={baseEvent}
        movies={makeMovies(1)}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={qc}>
        <LocaleProvider>
          <WheelSection
            slug="soiree"
            event={{ ...baseEvent, winnerMovie: sampleWinner }}
            movies={makeMovies(1)}
            hostToken={null}
            onWheelDone={vi.fn()}
            onCloseDone={vi.fn()}
            viewMode="grid"
          />
        </LocaleProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });

  it("affiche le badge Choisi par l'hôte quand winnerPickMethod est manual", () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, winnerMovie: sampleWinner, winnerPickMethod: 'manual' }}
        movies={makeMovies(1)}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.getByText(/choisi par l.hôte/i)).toBeInTheDocument();
  });

  it("n'affiche pas de badge quand winnerPickMethod est wheel", () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, winnerMovie: sampleWinner, winnerPickMethod: 'wheel' }}
        movies={makeMovies(1)}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.queryByText(/choisi par l.hôte/i)).not.toBeInTheDocument();
  });

  it("affiche le bouton Choisir moi-même pour l'hôte avec des films", () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={makeMovies(2)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );
    expect(screen.getByRole('button', { name: /choisir moi-même/i })).toBeInTheDocument();
  });

  it('active puis annule le mode sélection manuelle via onManualSelectionChange', async () => {
    const onManualSelectionChange = vi.fn();
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={makeMovies(2)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
        onManualSelectionChange={onManualSelectionChange}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /choisir moi-même/i }));
    expect(onManualSelectionChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ active: true, pending: false })
    );
    expect(screen.getByText(/désigner gagnant/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^annuler$/i }));
    expect(onManualSelectionChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/désigner gagnant/i)).not.toBeInTheDocument();
  });

  it('masque « Annuler le tirage » pendant le mode sélection manuelle pour éviter la confusion avec « Annuler »', async () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true, winnerMovie: sampleWinner }}
        movies={makeMovies(2)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );

    expect(screen.getByRole('button', { name: /annuler le tirage/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /choisir moi-même/i }));

    expect(screen.queryByRole('button', { name: /annuler le tirage/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^annuler$/i })).toBeInTheDocument();
  });

  it('sélection manuelle : appelle postEventWinner puis affiche le gagnant avec le badge hôte', async () => {
    postEventWinnerMock.mockResolvedValueOnce({
      winner: sampleWinner,
      message: "Film choisi par l'hôte.",
    });
    const onManualSelectionChange = vi.fn();
    const onWheelDone = vi.fn();
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={makeMovies(2)}
        hostToken="ht"
        onWheelDone={onWheelDone}
        onCloseDone={vi.fn()}
        viewMode="grid"
        onManualSelectionChange={onManualSelectionChange}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /choisir moi-même/i }));
    const selection = onManualSelectionChange.mock.calls.at(-1)?.[0] as MovieCardSelection;
    await selection.onSelect(makeMovies(2)[0]!);

    expect(postEventWinnerMock).toHaveBeenCalledWith('soiree', 'm0', 'ht');
    await waitFor(() => expect(screen.getByTestId('wheel-modal-mock')).toBeInTheDocument());
    expect(screen.getByTestId('wheel-modal-mock')).toHaveAttribute('data-skip-spin', 'true');
    expect(screen.getByTestId('wheel-modal-mock')).toHaveAttribute('data-has-relaunch', 'false');
    expect(screen.getByTestId('wheel-modal-mock')).toHaveTextContent('Inception');
    expect(onManualSelectionChange).toHaveBeenLastCalledWith(null);
  });

  it('tirage à la roue : la modale reçoit un relaunch et pas de skipSpin', async () => {
    postEventWheelMock.mockResolvedValueOnce({ winner: sampleWinner, message: 'Roue lancée.' });
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={makeMovies(2)}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /lancer la roue/i }));

    await waitFor(() => expect(screen.getByTestId('wheel-modal-mock')).toBeInTheDocument());
    expect(screen.getByTestId('wheel-modal-mock')).toHaveAttribute('data-skip-spin', 'false');
    expect(screen.getByTestId('wheel-modal-mock')).toHaveAttribute('data-has-relaunch', 'true');
  });

  it('tous les films exclus : désactive le tirage et affiche l’aide', () => {
    const excluded = makeMovies(2).map((m) => ({ ...m, excludedFromWheel: true }));
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={excluded}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );

    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /choisir moi-même/i })).toBeDisabled();
    expect(screen.getByText(/tous les films sont exclus du tirage/i)).toBeInTheDocument();
  });

  it('un seul film éligible : le tirage reste possible', () => {
    const [first, second] = makeMovies(2);
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        movies={[{ ...first!, excludedFromWheel: true }, second!]}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
        viewMode="grid"
      />
    );

    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeEnabled();
    expect(screen.queryByText(/tous les films sont exclus du tirage/i)).not.toBeInTheDocument();
  });
});
