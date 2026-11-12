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

function renderSection(
  stats: UserStats,
  watchedCount?: number,
  watchedPending = false,
  proposalLinks: { proposalsTo?: string; winningProposalsTo?: string } = {}
) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileStatsSection
          stats={stats}
          watchedCount={watchedCount}
          watchedPending={watchedPending}
          watchedTo="/u/lea/films"
          {...proposalLinks}
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

  it('leads from the proposals and the winning proposals figures to their lists', () => {
    renderSection(BUSY_STATS, 26, false, {
      proposalsTo: '/u/lea/propositions',
      winningProposalsTo: '/u/lea/propositions-gagnantes',
    });
    expect(screen.getByRole('link', { name: /34\s*films proposés/i })).toHaveAttribute(
      'href',
      '/u/lea/propositions'
    );
    expect(screen.getByRole('link', { name: /7\s*propositions gagnantes/i })).toHaveAttribute(
      'href',
      '/u/lea/propositions-gagnantes'
    );
  });

  it('keeps a proposals figure at zero as plain text, with no list to open', () => {
    renderSection({ ...BUSY_STATS, winningProposals: 0 }, 26, false, {
      proposalsTo: '/u/lea/propositions',
      winningProposalsTo: '/u/lea/propositions-gagnantes',
    });
    expect(screen.getByText('propositions gagnantes').closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: /34\s*films proposés/i })).toBeInTheDocument();
  });

  it('shows the average rating of the proposals on the viewer scale, after the winning proposals', () => {
    renderSection({ ...BUSY_STATS, proposalsAverageRating: 6.86 }, 26);
    const figures = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(figures).toEqual([
      '26films vus',
      '12soirées créées',
      '1soirée rejointe',
      '34films proposés',
      '7propositions gagnantes',
      '3,4/5note moyenne des propositions',
      '58votes',
    ]);
  });

  it('leaves the average rating out while too few proposals are rated', () => {
    renderSection({ ...BUSY_STATS, proposalsAverageRating: null }, 26);
    expect(screen.queryByText('note moyenne des propositions')).not.toBeInTheDocument();
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
