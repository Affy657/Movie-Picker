import type { MyEventSummary } from '@/features/events/types';

export function buildMyEventSummary(overrides: Partial<MyEventSummary> = {}): MyEventSummary {
  return {
    id: 'e1',
    slug: 'soiree',
    title: 'Soirée',
    date: '2030-01-01',
    time: '20:30',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isCreator: false,
    isParticipant: true,
    lifecycle: 'upcoming',
    participantCount: 0,
    movieCount: 0,
    maxParticipants: null,
    theme: null,
    winnerMovies: [],
    averageRating: null,
    myRating: null,
    hasWinnerToRate: false,
    autoCloseAt: null,
    topMovies: [],
    participantsPreview: [],
    hasVoted: false,
    ...overrides,
  };
}
