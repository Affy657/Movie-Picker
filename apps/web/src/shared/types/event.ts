import type { MovieData } from '@/shared/types/movie';

export type MyEventLifecycle = 'upcoming' | 'live' | 'finished';

export type WheelMode = 'strictRandom' | 'weightedByVotes';

export interface EventConfigData {
  theme: string | null;
  themeColor?: number | null;
  endDate: string | null;
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
}

export interface EventData {
  id: string;
  title: string;
  date: string;
  time: string;
  slug: string;
  isHost?: boolean;
  isFinished?: boolean;
  closedAt?: string | null;
  winnerMovie?: MovieData | null;

  config?: EventConfigData;

  myParticipant?: { id: string; pseudo: string } | null;

  participantCount?: number;

  movieCount?: number;

  participants?: EventParticipantSummary[];
}
