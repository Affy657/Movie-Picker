import { describe, expect, it } from 'vitest';
import type { FriendGroupMemberStats } from '@/features/groups/api/groupsApi';
import { RANKING_STATS, rankMembers } from './groupRanking';

function stats(
  userId: string,
  overrides: Partial<FriendGroupMemberStats> = {}
): FriendGroupMemberStats {
  return {
    userId,
    proposedCount: 0,
    winningCount: 0,
    ratedWinningCount: 0,
    proposalsAverageRating: null,
    upVotesReceived: 0,
    upVotesCast: 0,
    upVotesOnWinner: 0,
    freshProposalCount: 0,
    nightsAttended: 0,
    nightsSinceJoined: 0,
    nightsHosted: 0,
    ratingsGiven: 0,
    averageRatingGiven: null,
    ...overrides,
  };
}

const ranks = (result: ReturnType<typeof rankMembers>) =>
  result.ranked.map((entry) => [entry.stats.userId, entry.rank, entry.tied, entry.share]);

describe('rankMembers', () => {
  it('offers the eight stats, the average rating of the proposed films first', () => {
    expect(RANKING_STATS).toEqual([
      'rating',
      'wins',
      'votes',
      'flair',
      'fresh',
      'presence',
      'host',
      'generous',
    ]);
  });

  it('ranks the average rating of the winning films from two rated films, on the viewer scale', () => {
    const result = rankMembers(
      'rating',
      [
        stats('lea', { winningCount: 6, ratedWinningCount: 6, proposalsAverageRating: 8.6 }),
        stats('ines', { winningCount: 3, ratedWinningCount: 3, proposalsAverageRating: 9.2 }),
        stats('noe', { winningCount: 1, ratedWinningCount: 1, proposalsAverageRating: 10 }),
        stats('hugo'),
        stats('sam', { winningCount: 2, ratedWinningCount: 1, proposalsAverageRating: 7 }),
      ],
      'five'
    );

    expect(ranks(result)).toEqual([
      ['ines', 1, false, 92],
      ['lea', 2, false, 86],
    ]);
    expect(result.ranked.map((entry) => entry.score)).toEqual([4.6, 4.3]);
    expect(result.unranked.map((entry) => [entry.stats.userId, entry.reason])).toEqual([
      ['noe', 'notEnoughRatedFilms'],
      ['hugo', 'noWinningFilm'],
      ['sam', 'notEnoughRatedFilms'],
    ]);
  });

  it('gives the same rank to members whose shown value is equal', () => {
    const result = rankMembers(
      'presence',
      [
        stats('lea', { nightsAttended: 15 }),
        stats('noe', { nightsAttended: 8 }),
        stats('hugo', { nightsAttended: 8 }),
        stats('sam', { nightsAttended: 3 }),
      ],
      'five'
    );

    expect(ranks(result)).toEqual([
      ['lea', 1, false, 100],
      ['noe', 2, true, 53],
      ['hugo', 2, true, 53],
      ['sam', 4, false, 20],
    ]);
  });

  it('compares counts against the leader and keeps a member with nothing at the bottom', () => {
    const result = rankMembers(
      'host',
      [stats('lea', { nightsHosted: 2 }), stats('sam', { nightsHosted: 4 }), stats('hugo')],
      'ten'
    );

    expect(ranks(result)).toEqual([
      ['sam', 1, false, 100],
      ['lea', 2, false, 50],
      ['hugo', 3, false, 0],
    ]);
  });

  it('ranks wins, votes received and fresh films only for members who proposed a film', () => {
    const members = [
      stats('lea', {
        proposedCount: 18,
        winningCount: 6,
        upVotesReceived: 36,
        freshProposalCount: 11,
      }),
      stats('ines', {
        proposedCount: 9,
        winningCount: 3,
        upVotesReceived: 22,
        freshProposalCount: 8,
      }),
      stats('hugo'),
    ];

    expect(ranks(rankMembers('wins', members, 'five'))).toEqual([
      ['lea', 1, false, 100],
      ['ines', 2, false, 50],
    ]);
    expect(rankMembers('votes', members, 'five').ranked.map((entry) => entry.score)).toEqual([
      2.4, 2,
    ]);
    expect(rankMembers('fresh', members, 'five').ranked.map((entry) => entry.score)).toEqual([
      89, 61,
    ]);
    for (const stat of ['wins', 'votes', 'fresh'] as const) {
      expect(rankMembers(stat, members, 'five').unranked).toEqual([
        { stats: members[2], reason: 'noProposal' },
      ]);
    }
  });

  it('ranks the flair from ten votes for a film', () => {
    const result = rankMembers(
      'flair',
      [
        stats('ines', { upVotesCast: 28, upVotesOnWinner: 20 }),
        stats('hugo', { upVotesCast: 9, upVotesOnWinner: 9 }),
      ],
      'five'
    );

    expect(ranks(result)).toEqual([['ines', 1, false, 71]]);
    expect(result.unranked.map((entry) => entry.reason)).toEqual(['notEnoughVotes']);
  });

  it('ranks the generosity from five ratings given, the most generous first', () => {
    const result = rankMembers(
      'generous',
      [
        stats('ines', { ratingsGiven: 11, averageRatingGiven: 5.8 }),
        stats('hugo', { ratingsGiven: 5, averageRatingGiven: 8.8 }),
        stats('noe', { ratingsGiven: 4, averageRatingGiven: 10 }),
      ],
      'ten'
    );

    expect(result.ranked.map((entry) => [entry.stats.userId, entry.score])).toEqual([
      ['hugo', 8.8],
      ['ines', 5.8],
    ]);
    expect(result.unranked.map((entry) => entry.reason)).toEqual(['notEnoughRatings']);
  });

  it('leaves out of the nights a member without any finished night', () => {
    const result = rankMembers('presence', [stats('zoe')], 'five');

    expect(result.ranked).toEqual([]);
    expect(result.unranked.map((entry) => entry.reason)).toEqual(['noNight']);
  });
});
