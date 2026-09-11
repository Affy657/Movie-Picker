import type { MovieData } from '@/shared/types/movie';

export type MyEventLifecycle = 'upcoming' | 'live' | 'pending' | 'finished';

export type WheelMode = 'strictRandom' | 'weightedByVotes';

export type WinnerPickMethod = 'wheel' | 'manual';

export type EventRecurrence = 'weekly' | 'biweekly' | 'monthly';

export interface EventConfigData {
  theme: string | null;
  maxProposalsPerParticipant: number | null;

  maxParticipants: number | null;

  maxVotesPerParticipant?: number | null;
  wheelMode: WheelMode;

  richSharePreview?: boolean;

  allowSeries?: boolean;

  recurrence?: EventRecurrence | null;

  hasNextOccurrence?: boolean;

  winnerCount: number;

  winnerCountMax: number;

  drawnWinnerCount: number;
}

export interface EventWinnerData {
  movieId: string;
  pickMethod: WinnerPickMethod;
  pickedAt: string;
  movie?: MovieData | null;
}

export interface EventParticipantSummary {
  id: string;
  pseudo: string;
  isCreator?: boolean;
  avatarId?: string;
  handle?: string | null;
}

export interface EventData {
  id: string;
  title: string;
  date: string;
  time: string;
  slug: string;
  isHost?: boolean;
  isFinished?: boolean;
  lifecycle?: MyEventLifecycle;
  closedAt?: string | null;
  winners?: EventWinnerData[];

  config?: EventConfigData;

  myParticipant?: { id: string; pseudo: string } | null;

  participantCount?: number;

  votersCount?: number;

  movieCount?: number;

  participants?: EventParticipantSummary[];
}
