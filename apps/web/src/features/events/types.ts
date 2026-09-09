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
};

export const EVENT_RECURRENCES: readonly EventRecurrence[] = ['weekly', 'biweekly', 'monthly'];

export type EventConfigPatchPayload = {
  title?: string;
  theme: string;
  maxProposalsPerParticipant: number;
  maxParticipants: number;
  wheelMode: WheelMode;
  richSharePreview: boolean;
  allowSeries: boolean;
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

  winnerMovieTitle?: string | null;

  winnerMoviePosterPath?: string | null;

  autoCloseAt?: string | null;
}

export interface MyEventsListResponse {
  events: MyEventSummary[];
  hasMore?: boolean;
  totalActive: number;
  totalFinished: number;
}
