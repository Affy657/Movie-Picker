import type { UserStats } from '@/features/profile/api/profileApi';

export type BadgeId = 'organizer' | 'cinephile' | 'kingmaker' | 'juror';

export interface BadgeDef {
  id: BadgeId;
  emoji: string;
  // Provisional thresholds — tune later.
  threshold: number;
  value: (stats: UserStats) => number;
}

export interface ComputedBadge extends BadgeDef {
  current: number;
  earned: boolean;
  progress: number; // 0..1
}

export const BADGES: readonly BadgeDef[] = [
  { id: 'organizer', emoji: '🎬', threshold: 5, value: (s) => s.eventsCreated },
  { id: 'cinephile', emoji: '🍿', threshold: 20, value: (s) => s.moviesSeen },
  { id: 'kingmaker', emoji: '👑', threshold: 3, value: (s) => s.winningProposals },
  { id: 'juror', emoji: '🗳️', threshold: 50, value: (s) => s.votesCast },
];

export function computeBadges(stats: UserStats): ComputedBadge[] {
  return BADGES.map((badge) => {
    const current = badge.value(stats);
    return {
      ...badge,
      current,
      earned: current >= badge.threshold,
      progress: badge.threshold > 0 ? Math.min(1, current / badge.threshold) : 0,
    };
  });
}
