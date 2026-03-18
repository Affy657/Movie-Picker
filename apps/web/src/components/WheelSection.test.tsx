import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WheelSection from './WheelSection';
import type { EventData } from '../types/event';

const baseEvent: EventData = {
  _id: 'e1',
  title: 'Soirée',
  date: '2030-01-01',
  time: '20:00',
  slug: 'soiree',
  isHost: false,
  terminé: false,
};

describe('WheelSection', () => {
  it('affiche le titre Roue', () => {
    render(
      <WheelSection
        slug="soiree"
        event={baseEvent}
        moviesCount={0}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /roue/i })).toBeInTheDocument();
  });

  it('affiche le placeholder si aucun film et pas hôte', () => {
    render(
      <WheelSection
        slug="soiree"
        event={baseEvent}
        moviesCount={0}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.getByText(/aucun film.*proposez/i)).toBeInTheDocument();
  });

  it('affiche le bouton Lancer la roue pour l’hôte avec des films', () => {
    render(
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

  it('affiche le film gagnant quand winner est présent', () => {
    render(
      <WheelSection
        slug="soiree"
        event={{
          ...baseEvent,
          winnerMovie: {
            _id: 'm1',
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
          },
        }}
        moviesCount={1}
        hostToken={null}
        onWheelDone={vi.fn()}
        onCloseDone={vi.fn()}
      />
    );
    expect(screen.getByText(/film gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
  });
});
