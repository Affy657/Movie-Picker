import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WheelSection from '@/features/events/components/WheelSection';
import type { EventData } from '@/features/events/types';
import { LocaleProvider } from '@/shared/i18n';

const baseEvent: EventData = {
  id: 'e1',
  title: 'Soirée',
  date: '2030-01-01',
  time: '20:00',
  slug: 'soiree',
  isHost: false,
  isFinished: false,
  config: {
    theme: null,
    endDate: null,
    maxProposalsPerParticipant: null,
    wheelMode: 'strictRandom',
    allowedReactionIds: null,
  },
};

function renderWheel(ui: ReactNode) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('WheelSection', () => {
  it('affiche le titre Roue pour l’hôte', () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        moviesCount={1}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /roue/i })).toBeInTheDocument();
  });

  it('n’affiche rien pour un invité tant qu’il n’y a pas de film tiré', () => {
    const { container } = renderWheel(
      <WheelSection
        slug="soiree"
        event={baseEvent}
        moviesCount={3}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('isHost false de l’API prime sur un hostToken présent (pas d’UI hôte sans gagnant)', () => {
    const { container } = renderWheel(
      <WheelSection
        slug="soiree"
        event={baseEvent}
        moviesCount={3}
        hostToken="stale-token"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('isHost absent (undefined) + hostToken → UI hôte', () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: undefined }}
        moviesCount={1}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /roue/i })).toBeInTheDocument();
  });

  it('affiche le placeholder si aucun film et hôte', () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        moviesCount={0}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.getByText(/aucun film.*proposez/i)).toBeInTheDocument();
  });

  it('affiche le bouton Lancer la roue pour l’hôte avec des films', () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{ ...baseEvent, isHost: true }}
        moviesCount={2}
        hostToken="ht"
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /lancer la roue/i })).toBeInTheDocument();
  });

  const sampleWinner = {
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

  it('invité : titre « résultat du tirage » et film gagnant', () => {
    renderWheel(
      <WheelSection
        slug="soiree"
        event={{
          ...baseEvent,
          winnerMovie: sampleWinner,
        }}
        moviesCount={1}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /r\u00e9sultat du tirage/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^roue$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });

  it('met à jour le gagnant quand winnerMovie arrive (ex. polling live)', () => {
    const { rerender } = renderWheel(
      <WheelSection
        slug="soiree"
        event={baseEvent}
        moviesCount={1}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();

    rerender(
      <LocaleProvider>
        <WheelSection
          slug="soiree"
          event={{ ...baseEvent, winnerMovie: sampleWinner }}
          moviesCount={1}
          hostToken={null}
          onWheelDone={vi.fn()}
          onCloseDone={vi.fn()}
        />
      </LocaleProvider>
    );
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });
});
