import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileStatsSection, { PROFILE_STATS_ID } from './ProfileStatsSection';
import type { UserStats } from '@/features/events/api/userStatsApi';

const EMPTY_STATS: UserStats = {
  eventsCreated: 0,
  eventsJoined: 0,
  moviesProposed: 0,
  votesCast: 0,
  winningProposals: 0,
  proposalsAverageRating: null,
  moviesSeen: 0,
  publicListCount: 0,
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
  proposalsAverageRating: 6.86,
  votesCast: 58,
};

function renderSection(
  stats: UserStats,
  options: { winningProposalsHidden?: boolean; isOwnProfile?: boolean; memberSince?: string } = {}
) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileStatsSection
          stats={stats}
          memberSince={options.memberSince ?? 'avril 2026'}
          proposalsTo="/u/lea/propositions"
          winningProposalsTo="/u/lea/propositions-gagnantes"
          winningProposalsHidden={options.winningProposalsHidden}
          isOwnProfile={options.isOwnProfile}
        />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function figures() {
  return within(screen.getByRole('list', { name: 'Chiffres clés' })).getAllByRole('listitem');
}

describe('ProfileStatsSection', () => {
  it('titles the section in plain sight, with the month the member joined', () => {
    renderSection(BUSY_STATS);
    const heading = screen.getByRole('heading', { name: 'Statistiques', level: 2 });
    expect(heading).not.toHaveClass('visually-hidden');
    expect(screen.getByText('depuis avril 2026')).toBeInTheDocument();
  });

  it('is the target of the summary links of the header', () => {
    renderSection(BUSY_STATS);
    expect(screen.getByRole('region', { name: 'Statistiques' })).toHaveAttribute(
      'id',
      PROFILE_STATS_ID
    );
  });

  it('lines up the movie nights, the proposals, the winners and their rating, each explained', () => {
    renderSection(BUSY_STATS);
    const [nights, proposed, winning, rating] = figures();
    expect(figures()).toHaveLength(4);
    expect(nights).toHaveTextContent('13soirées12 organisées, 1 rejointe');
    expect(proposed).toHaveTextContent('34films proposés2,6 par soirée');
    expect(winning).toHaveTextContent(/^7films gagnants21\s%\sdes films proposés$/);
    expect(rating).toHaveTextContent('3,4/5note moyennedes films gagnants notés');
  });

  it('drops the votes, which say nothing on their own', () => {
    renderSection(BUSY_STATS);
    expect(screen.queryByText(/votes?$/)).not.toBeInTheDocument();
  });

  it('leads from the proposals and the winners to their lists', () => {
    renderSection(BUSY_STATS);
    expect(screen.getByRole('link', { name: /34\s*films proposés/ })).toHaveAttribute(
      'href',
      '/u/lea/propositions'
    );
    expect(screen.getByRole('link', { name: /7\s*films gagnants/ })).toHaveAttribute(
      'href',
      '/u/lea/propositions-gagnantes'
    );
  });

  it('leaves out a figure at zero instead of showing a 0', () => {
    renderSection({ ...BUSY_STATS, winningProposals: 0, proposalsAverageRating: null });
    expect(figures()).toHaveLength(2);
    expect(screen.queryByText(/films? gagnants?$/)).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('leaves the winners and their rating out when they are hidden', () => {
    renderSection(BUSY_STATS, { winningProposalsHidden: true });
    expect(figures()).toHaveLength(2);
    expect(screen.queryByText('note moyenne')).not.toBeInTheDocument();
  });

  it.each([
    [{ eventsCreated: 0, eventsJoined: 8 }, '8soiréestoutes rejointes'],
    [{ eventsCreated: 3, eventsJoined: 0 }, '3soiréestoutes organisées'],
    [{ eventsCreated: 0, eventsJoined: 1 }, '1soiréerejointe'],
    [{ eventsCreated: 1, eventsJoined: 0 }, '1soiréeorganisée'],
  ])('says how the movie nights split between hosted and joined (%o)', (split, expected) => {
    renderSection({ ...EMPTY_STATS, ...split });
    expect(figures()[0]).toHaveTextContent(expected);
  });

  it('shows nothing to a visitor while the member has no movie night', () => {
    const { container } = renderSection(EMPTY_STATS);
    expect(container).toBeEmptyDOMElement();
  });

  it('tells the owner what will show up, and how to start', () => {
    renderSection(EMPTY_STATS, { isOwnProfile: true });
    expect(screen.getByRole('heading', { name: 'Statistiques' })).toBeInTheDocument();
    expect(
      screen.getByText(/vos stats apparaîtront après votre première soirée/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer une soirée' })).toHaveAttribute('href', '/new');
  });

  it('adds the rhythm and the favourite genres below the figures', async () => {
    renderSection({
      ...BUSY_STATS,
      dailyActivity: [
        { date: '2026-06-01', count: 1 },
        { date: '2026-06-02', count: 1 },
      ],
      favoriteGenres: [{ genreId: 18, count: 20 }],
    });
    expect(await screen.findByRole('heading', { name: 'Rythme', level: 3 })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Genres préférés', level: 3 })
    ).toBeInTheDocument();
  });
});
