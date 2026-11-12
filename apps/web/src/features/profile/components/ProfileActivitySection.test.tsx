import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileActivitySection from './ProfileActivitySection';
import type { UserStats } from '@/features/events/api/userStatsApi';

const STATS: UserStats = {
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
      <ProfileActivitySection stats={stats} />
    </AppTestProviders>
  );
}

describe('ProfileActivitySection', () => {
  it('renders nothing without a single participation nor a proposed genre', () => {
    const { container } = renderSection({
      ...STATS,
      dailyActivity: [{ date: '2026-06-01', count: 0 }],
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('sums the participations of the six months in plain words above the weeks', async () => {
    renderSection({
      ...STATS,
      dailyActivity: [
        { date: '2026-06-01', count: 2 },
        { date: '2026-06-09', count: 1 },
      ],
    });
    expect(screen.getByRole('heading', { name: 'En soirée' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('soirées ces six derniers mois')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /3 au total/ })).toBeInTheDocument();
  });

  it('agrees the participation label in the singular', () => {
    renderSection({ ...STATS, dailyActivity: [{ date: '2026-06-01', count: 1 }] });
    expect(screen.getByText('soirée ces six derniers mois')).toBeInTheDocument();
  });

  it('shows the proposed genres on their own and says where they come from', async () => {
    renderSection({ ...STATS, favoriteGenres: [{ genreId: 878, count: 6 }] });
    expect(screen.queryByRole('heading', { name: 'En soirée' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Genres préférés' })).toBeInTheDocument();
    expect(await screen.findByText('Science-fiction')).toBeInTheDocument();
    expect(screen.getByText('D’après les films proposés en soirée.')).toBeInTheDocument();
  });
});
