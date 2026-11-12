import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

const BUSY_STATS: UserStats = {
  ...EMPTY_STATS,
  eventsCreated: 12,
  eventsJoined: 1,
  moviesProposed: 34,
  winningProposals: 7,
  votesCast: 58,
};

function renderSection(stats: UserStats, watchedCount?: number, watchedPending = false) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileStatsSection
          stats={stats}
          watchedCount={watchedCount}
          watchedPending={watchedPending}
          watchedTo="/u/lea/films"
        />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileStatsSection', () => {
  it('names the strip for assistive technologies without showing a title', () => {
    renderSection(BUSY_STATS, 26);
    expect(screen.getByRole('heading', { name: 'Statistiques' })).toHaveClass('visually-hidden');
  });

  it('shows the empty state when every figure is 0, without a strip of zeros', () => {
    renderSection(EMPTY_STATS, 0);
    expect(screen.getByText('Aucune activité pour le moment.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lines up the watched movies first, then the movie nights, the proposals and the votes', () => {
    renderSection(BUSY_STATS, 26);
    const figures = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(figures).toEqual([
      '26films vus',
      '12soirées créées',
      '1soirée rejointe',
      '34films proposés',
      '7propositions gagnantes',
      '58votes',
    ]);
  });

  it('leads from the watched movies figure to the full list', () => {
    renderSection(BUSY_STATS, 26);
    expect(screen.getByRole('link', { name: /26\s*films vus/i })).toHaveAttribute(
      'href',
      '/u/lea/films'
    );
  });

  it.each([
    ['unavailable', undefined],
    ['zero', 0],
  ])('leaves the watched movies figure out while their count is %s', (_label, count) => {
    renderSection(BUSY_STATS, count);
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(5);
    expect(screen.queryByText('films vus')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the first place for the watched movies figure while their count loads', () => {
    renderSection(BUSY_STATS, undefined, true);
    const places = screen.getAllByRole('listitem', { hidden: true });
    expect(places).toHaveLength(6);
    expect(places[0]).toHaveAttribute('aria-hidden', 'true');
    expect(places[0]).toHaveTextContent('');
    expect(places[1]).toHaveTextContent('12soirées créées');
  });
});
