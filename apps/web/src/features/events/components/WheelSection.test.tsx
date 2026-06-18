import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WheelSection from '@/features/events/components/WheelSection';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';

vi.mock('./WheelModal', () => ({ default: () => null }));
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

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
      />
    );
    expect(screen.getByRole('heading', { name: /résultat du tirage/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^roue$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
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
          />
        </LocaleProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });
});
