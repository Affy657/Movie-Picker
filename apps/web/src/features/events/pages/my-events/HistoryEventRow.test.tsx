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

  it('lists the titles when several movies won', () => {
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

  it('puts the count on the thumbnail beyond one winner', () => {
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

  it('carries the date, the counts and the host mark next to the title', () => {
    renderRow({ ...base, maxParticipants: 8 });

    expect(screen.getByText(/2 sept\./)).toBeInTheDocument();
    expect(screen.getByText('6 / 8')).toBeInTheDocument();
    expect(screen.getByText('8 films proposés')).toBeInTheDocument();
    expect(screen.getByTitle('Vous organisez cette soirée')).toBeInTheDocument();
  });

  it('falls back to the no-movie state when the movie night has no winner', () => {
    renderRow(base);

    expect(screen.getByText(/terminée sans film/i)).toBeInTheDocument();
  });
});
