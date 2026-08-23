import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileStatsSection from './ProfileStatsSection';
import type { UserStats } from '@/features/profile/api/profileApi';

const EMPTY_STATS: UserStats = {
  eventsCreated: 0,
  eventsJoined: 0,
  moviesProposed: 0,
  votesCast: 0,
  winningProposals: 0,
  moviesSeen: 0,
  currentStreakWeeks: 0,
  bestStreakWeeks: 0,
  favoriteGenres: [],
  dailyActivity: [],
};

function renderSection(stats: UserStats) {
  return render(
    <AppTestProviders>
      <ProfileStatsSection stats={stats} />
    </AppTestProviders>
  );
}

describe('ProfileStatsSection', () => {
  it('affiche le titre de section', () => {
    renderSection(EMPTY_STATS);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it("affiche l'état vide si toutes les stats sont à 0, sans la grille de compteurs à zéro", () => {
    renderSection(EMPTY_STATS);
    expect(screen.getByText(/aucune activité/i)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it("n'affiche pas l'état vide si un compteur est > 0", () => {
    renderSection({ ...EMPTY_STATS, eventsCreated: 3 });
    expect(screen.queryByText(/aucune activité/i)).toBeNull();
  });

  it('affiche 4 entrées dans la grille des compteurs', () => {
    renderSection({ ...EMPTY_STATS, eventsCreated: 1 });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('affiche la valeur du compteur eventsCreated', () => {
    renderSection({ ...EMPTY_STATS, eventsCreated: 7 });
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('ne montre plus le streak dans la grille des compteurs (déplacé dans la pastille de série)', () => {
    renderSection({ ...EMPTY_STATS, currentStreakWeeks: 3, bestStreakWeeks: 5 });
    expect(screen.queryByText(/meilleur streak/i)).toBeNull();
  });

  it('affiche le panneau activité si au moins un jour a count > 0', async () => {
    renderSection({
      ...EMPTY_STATS,
      dailyActivity: [{ date: '2026-01-01', count: 2 }],
    });
    expect(await screen.findByText(/activité/i)).toBeInTheDocument();
  });

  it('affiche le panneau genres si favoriteGenres est non vide', async () => {
    renderSection({
      ...EMPTY_STATS,
      favoriteGenres: [{ genreId: 28, count: 5 }],
    });
    await waitFor(() => {
      expect(screen.getByText(/genres favoris/i)).toBeInTheDocument();
    });
  });

  it("n'affiche pas le panneau activité si tous les counts sont 0", () => {
    renderSection({
      ...EMPTY_STATS,
      dailyActivity: [{ date: '2026-01-01', count: 0 }],
    });
    expect(screen.queryByText(/activité \(6 mois\)/i)).toBeNull();
  });
});
