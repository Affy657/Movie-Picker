import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HistoryEventRow from '@/features/events/pages/my-events/HistoryEventRow';
import type { MyEventSummary } from '@/features/events/types';
import { LocaleProvider } from '@/shared/i18n';

const base: MyEventSummary = {
  id: 'e1',
  slug: 'soiree',
  title: 'Ciné-club du mardi',
  date: '2026-09-02',
  time: '20:00',
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-09-02T23:00:00Z',
  isCreator: true,
  isParticipant: true,
  lifecycle: 'finished',
  participantCount: 6,
  movieCount: 8,
  winnerMovies: [],
};

function renderRow(event: MyEventSummary) {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <HistoryEventRow event={event} />
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe('HistoryEventRow', () => {
  it('affiche le titre du seul film gagnant', () => {
    renderRow({ ...base, winnerMovies: [{ title: 'Parasite', posterPath: '/p.jpg' }] });

    expect(screen.getByText('Parasite')).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('énumère les titres quand plusieurs films ont gagné', () => {
    renderRow({
      ...base,
      winnerMovies: [
        { title: 'Parasite', posterPath: '/p.jpg' },
        { title: 'Whiplash', posterPath: '/w.jpg' },
        { title: 'Perfect Days', posterPath: null },
      ],
    });

    expect(screen.getByText('Parasite, Whiplash et Perfect Days')).toBeInTheDocument();
  });

  it('pose le compte sur la vignette au-delà d un gagnant', () => {
    renderRow({
      ...base,
      winnerMovies: [
        { title: 'Parasite', posterPath: '/p.jpg' },
        { title: 'Whiplash', posterPath: '/w.jpg' },
      ],
    });

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('garde une seule affiche, celle du premier film gagnant', () => {
    renderRow({
      ...base,
      winnerMovies: [
        { title: 'Parasite', posterPath: '/premier.jpg' },
        { title: 'Whiplash', posterPath: '/second.jpg' },
      ],
    });

    const posters = document.querySelectorAll('img');
    expect(posters).toHaveLength(1);
    expect(posters[0]!.getAttribute('src')).toContain('premier.jpg');
  });

  it('retombe sur l état sans film quand la soirée n a pas de gagnant', () => {
    renderRow(base);

    expect(screen.getByText(/terminée sans film/i)).toBeInTheDocument();
  });
});
