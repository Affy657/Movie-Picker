import type { FriendGroupMemberStats } from '@/features/groups/api/groupsApi';
import type { RatingScale } from '@/shared/types/theme';
import { RATING_MAX, ratingScaleMax } from '@/shared/utils/formatRating';

export const RANKING_STATS = [
  'rating',
  'wins',
  'votes',
  'flair',
  'fresh',
  'presence',
  'host',
  'generous',
] as const;

export type RankingStat = (typeof RANKING_STATS)[number];

export const RANKING_MINIMUMS = { ratedFilms: 2, upVotes: 10, ratingsGiven: 5 } as const;

export type UnrankedReason =
  | 'notEnoughRatedFilms'
  | 'noWinningFilm'
  | 'noProposal'
  | 'notEnoughVotes'
  | 'noNight'
  | 'notEnoughRatings';

export interface RankedMember {
  stats: FriendGroupMemberStats;
  score: number;
  rank: number;
  tied: boolean;
  share: number;
}

export interface UnrankedMember {
  stats: FriendGroupMemberStats;
  reason: UnrankedReason;
}

export interface MemberRanking {
  ranked: RankedMember[];
  unranked: UnrankedMember[];
}

type Measure = { score: number } | { reason: UnrankedReason };

const PERCENT = 100;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function percent(part: number, whole: number): number {
  return Math.round((part / whole) * PERCENT);
}

function onScale(rating: number, scale: RatingScale): number {
  return roundTo((rating * ratingScaleMax(scale)) / RATING_MAX, 1);
}

function fromProposals(
  member: FriendGroupMemberStats,
  score: (proposed: number) => number
): Measure {
  return member.proposedCount === 0
    ? { reason: 'noProposal' }
    : { score: score(member.proposedCount) };
}

function ratingOfFilms(member: FriendGroupMemberStats, scale: RatingScale): Measure {
  if (member.winningCount === 0) return { reason: 'noWinningFilm' };
  if (
    member.ratedWinningCount < RANKING_MINIMUMS.ratedFilms ||
    member.proposalsAverageRating === null
  )
    return { reason: 'notEnoughRatedFilms' };
  return { score: onScale(member.proposalsAverageRating, scale) };
}

function ratingGiven(member: FriendGroupMemberStats, scale: RatingScale): Measure {
  return member.ratingsGiven < RANKING_MINIMUMS.ratingsGiven || member.averageRatingGiven === null
    ? { reason: 'notEnoughRatings' }
    : { score: onScale(member.averageRatingGiven, scale) };
}

const MEASURES: Record<
  RankingStat,
  (member: FriendGroupMemberStats, scale: RatingScale) => Measure
> = {
  rating: ratingOfFilms,
  wins: (member) => fromProposals(member, () => member.winningCount),
  votes: (member) =>
    fromProposals(member, (proposed) => roundTo(member.upVotesReceived / proposed, 1)),
  flair: (member) =>
    member.upVotesCast < RANKING_MINIMUMS.upVotes
      ? { reason: 'notEnoughVotes' }
      : { score: percent(member.upVotesOnWinner, member.upVotesCast) },
  fresh: (member) =>
    fromProposals(member, (proposed) => percent(member.freshProposalCount, proposed)),
  presence: (member) =>
    member.nightsSinceJoined === 0
      ? { reason: 'noNight' }
      : { score: percent(member.nightsAttended, member.nightsSinceJoined) },
  host: (member) => ({ score: member.nightsHosted }),
  generous: ratingGiven,
};

function measure(stat: RankingStat, member: FriendGroupMemberStats, scale: RatingScale): Measure {
  return MEASURES[stat](member, scale);
}

function ceilingOf(stat: RankingStat, scores: readonly number[], scale: RatingScale): number {
  if (stat === 'rating' || stat === 'generous') return ratingScaleMax(scale);
  if (stat === 'flair' || stat === 'fresh' || stat === 'presence') return PERCENT;
  return Math.max(0, ...scores);
}

export function rankMembers(
  stat: RankingStat,
  members: readonly FriendGroupMemberStats[],
  scale: RatingScale
): MemberRanking {
  const scored: { stats: FriendGroupMemberStats; score: number }[] = [];
  const unranked: UnrankedMember[] = [];
  for (const member of members) {
    const result = measure(stat, member, scale);
    if ('score' in result) scored.push({ stats: member, score: result.score });
    else unranked.push({ stats: member, reason: result.reason });
  }

  const ceiling = ceilingOf(
    stat,
    scored.map((entry) => entry.score),
    scale
  );
  const ranked = [...scored]
    .sort((a, b) => b.score - a.score)
    .map((entry, _index, all) => ({
      ...entry,
      rank: all.filter((other) => other.score > entry.score).length + 1,
      tied: all.filter((other) => other.score === entry.score).length > 1,
      share: ceiling === 0 ? 0 : Math.round((entry.score / ceiling) * PERCENT),
    }));

  return { ranked, unranked };
}
