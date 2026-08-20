import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WheelSection from '@/features/events/components/WheelSection';
import EventWheelActions from '@/features/events/components/EventWheelActions';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
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
};

function WheelHarness({ event, movies, hostToken }: Readonly<HarnessProps>) {
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
      <EventWheelActions wheel={wheel} />
      <WheelSection slug="soiree" event={event} movies={movies} wheel={wheel} viewMode="grid" />
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
    expect(screen.getByRole('heading', { name: /résultat du tirage/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lancer la roue/i })).not.toBeInTheDocument();
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
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
});
