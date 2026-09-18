import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileStatsSection from './ProfileStatsSection';
import type { UserStats } from '@/features/events/api/userStatsApi';

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

  it('shows the empty state when every stat is 0, without the grid of zero counters', () => {
    renderSection(EMPTY_STATS);
    expect(screen.getByText(/aucune activité/i)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('does not show the empty state when a counter is > 0', () => {
    renderSection({ ...EMPTY_STATS, eventsCreated: 3 });
    expect(screen.queryByText(/aucune activité/i)).toBeNull();
  });

  it('shows 4 entries in the counters grid', () => {
    renderSection({ ...EMPTY_STATS, eventsCreated: 1 });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('affiche la valeur du compteur eventsCreated', () => {
    renderSection({ ...EMPTY_STATS, eventsCreated: 7 });
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('no longer shows the streak in the counters grid (moved to the streak chip)', () => {
    renderSection({ ...EMPTY_STATS, currentStreakWeeks: 3, bestStreakWeeks: 5 });
    expect(screen.queryByText(/meilleur streak/i)).toBeNull();
  });

  it('shows the activity panel when at least one day has count > 0', async () => {
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

  it('does not show the activity panel when every count is 0', () => {
    renderSection({
      ...EMPTY_STATS,
      dailyActivity: [{ date: '2026-01-01', count: 0 }],
    });
    expect(screen.queryByText(/activité \(6 mois\)/i)).toBeNull();
  });
});
