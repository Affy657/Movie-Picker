import type {
  EventConfigData,
  EventRecurrence,
  MyEventLifecycle,
  WheelMode,
} from '@/shared/types/event';

export type { WheelMode, EventConfigData, EventData, EventRecurrence } from '@/shared/types/event';

export const MAX_EVENT_PARTICIPANTS = 300;

export const MAX_PROPOSALS_PER_PARTICIPANT = 15;

export const DEFAULT_EVENT_CONFIG: EventConfigData = {
  theme: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
  recurrence: null,
  winnerCount: 1,
  winnerCountMax: 10,
  drawnWinnerCount: 0,
};

export const EVENT_RECURRENCES: readonly EventRecurrence[] = ['weekly', 'biweekly', 'monthly'];

export const MAX_WINNERS_PER_EVENT = 10;

export type EventConfigPatchPayload = {
  title?: string;
  theme?: string;
  maxProposalsPerParticipant?: number;
  maxParticipants?: number;
  wheelMode?: WheelMode;
  richSharePreview?: boolean;
  allowSeries?: boolean;
  winnerCount?: number;
  recurrence?: EventRecurrence;
  clearRecurrence?: boolean;
  date?: string;
  time?: string;
  notifyParticipantsOfDateChange?: boolean;
};

export type MyEventsScope = 'active' | 'finished';

export interface MyEventSummary {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
  isCreator: boolean;
  isParticipant: boolean;

  lifecycle?: MyEventLifecycle | (string & {});
  participantCount?: number;
  movieCount?: number;

  maxParticipants?: number | null;

  theme?: string | null;

  winnerMovies?: MyEventWinnerMovie[];

  autoCloseAt?: string | null;
}

export interface MyEventWinnerMovie {
  title: string;
  posterPath?: string | null;
}

export interface MyEventsListResponse {
  events: MyEventSummary[];
  hasMore?: boolean;
  totalActive: number;
  totalFinished: number;
}
