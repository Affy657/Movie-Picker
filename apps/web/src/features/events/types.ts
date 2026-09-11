import type { EventConfigData, MyEventLifecycle, WheelMode } from '@/shared/types/event';

export type { WheelMode, EventConfigData, EventData } from '@/shared/types/event';

export const MAX_EVENT_PARTICIPANTS = 300;

export const MAX_PROPOSALS_PER_PARTICIPANT = 15;

export const DEFAULT_EVENT_CONFIG: EventConfigData = {
  theme: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
};

export const MAX_EVENT_TEMPLATES = 5;

export const MAX_EVENT_TEMPLATE_NAME_LENGTH = 60;

export interface EventTemplateData {
  id: string;
  name: string;
  theme: string | null;
  maxProposalsPerParticipant: number | null;
  maxParticipants: number | null;
  wheelMode: WheelMode;
  richSharePreview: boolean;
  allowSeries: boolean;
}

export type SaveEventTemplateBody = Omit<EventTemplateData, 'id'>;

export type EventConfigPatchPayload = {
  title?: string;
  theme: string;
  maxProposalsPerParticipant: number;
  maxParticipants: number;
  wheelMode: WheelMode;
  richSharePreview: boolean;
  allowSeries: boolean;
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
