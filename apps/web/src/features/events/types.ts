import type { EventConfigData, MyEventLifecycle, WheelMode } from '@/shared/types/event';

export type { WheelMode, EventConfigData, EventData } from '@/shared/types/event';

export const MAX_EVENT_PARTICIPANTS = 30;

export const MAX_PROPOSALS_PER_PARTICIPANT = 10;

export const DEFAULT_EVENT_CONFIG: EventConfigData = {
  theme: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  wheelMode: 'strictRandom',
  richSharePreview: true,
  allowSeries: false,
};

export type EventConfigPatchPayload = {
  title?: string;
  theme: string;
  themeColor?: number | null;
  clearThemeColor?: boolean;
  maxProposalsPerParticipant: number;
  maxParticipants: number;
  wheelMode: WheelMode;
  richSharePreview: boolean;
  allowSeries: boolean;
  date?: string;
  time?: string;
};

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
}

export interface MyEventsListResponse {
  events: MyEventSummary[];
  hasMore?: boolean;
}
