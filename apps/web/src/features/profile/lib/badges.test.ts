import { describe, it, expect } from 'vitest';
import { computeBadges } from './badges';
import type { UserStats } from '@/features/profile/api/profileApi';

function makeStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    eventsCreated: 0,
    eventsJoined: 0,
    moviesProposed: 0,
    votesCast: 0,
    winningProposals: 0,
    moviesSeen: 0,
    favoriteGenres: [],
    monthlyActivity: [],
    ...overrides,
  };
}

describe('computeBadges', () => {
  it('renvoie 4 badges pour des stats nulles, tous verrouillés', () => {
    const badges = computeBadges(makeStats());
    expect(badges).toHaveLength(4);
    expect(badges.every((b) => !b.earned)).toBe(true);
  });

  it('débloque le badge Organisateur quand eventsCreated >= 5', () => {
    const badges = computeBadges(makeStats({ eventsCreated: 5 }));
    const b = badges.find((b) => b.id === 'organizer')!;
    expect(b.earned).toBe(true);
    expect(b.current).toBe(5);
  });

  it("ne débloque pas l'Organisateur avec 4 soirées", () => {
    const b = computeBadges(makeStats({ eventsCreated: 4 })).find((b) => b.id === 'organizer')!;
    expect(b.earned).toBe(false);
    expect(b.progress).toBeCloseTo(4 / 5);
  });

  it('débloque le badge Cinéphile quand moviesSeen >= 20', () => {
    const b = computeBadges(makeStats({ moviesSeen: 20 })).find((b) => b.id === 'cinephile')!;
    expect(b.earned).toBe(true);
  });

  it('débloque le badge Faiseur de rois quand winningProposals >= 3', () => {
    const b = computeBadges(makeStats({ winningProposals: 3 })).find((b) => b.id === 'kingmaker')!;
    expect(b.earned).toBe(true);
  });

  it('débloque le badge Juré assidu quand votesCast >= 50', () => {
    const b = computeBadges(makeStats({ votesCast: 50 })).find((b) => b.id === 'juror')!;
    expect(b.earned).toBe(true);
  });

  it('la progression est plafonnée à 1 même si la valeur dépasse le seuil', () => {
    const b = computeBadges(makeStats({ eventsCreated: 100 })).find((b) => b.id === 'organizer')!;
    expect(b.progress).toBe(1);
    expect(b.earned).toBe(true);
  });
});
