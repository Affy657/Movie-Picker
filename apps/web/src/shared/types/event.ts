import type { MovieData } from '@/shared/types/movie';

export type MyEventLifecycle = 'upcoming' | 'live' | 'pending' | 'finished';

export type WheelMode = 'strictRandom' | 'weightedByVotes';

export type WinnerPickMethod = 'wheel' | 'manual';

export interface EventConfigData {
  theme: string | null;
  themeColor?: number | null;
  maxProposalsPerParticipant: number | null;

  maxParticipants: number | null;
  wheelMode: WheelMode;

  richSharePreview?: boolean;

  allowSeries?: boolean;
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
  winnerMovie?: MovieData | null;

  winnerPickMethod?: WinnerPickMethod | null;
  winnerPickedAt?: string | null;

  config?: EventConfigData;

  myParticipant?: { id: string; pseudo: string } | null;

  participantCount?: number;

  movieCount?: number;

  participants?: EventParticipantSummary[];
}
