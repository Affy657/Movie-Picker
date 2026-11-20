import type { ApiSchemas } from '@/shared/api/contract';
import type { EventConfigData, EventRecurrence, WheelMode } from '@/shared/types/event';

export type { WheelMode, EventConfigData, EventData, EventRecurrence } from '@/shared/types/event';

export const MAX_EVENT_PARTICIPANTS = 300;

export const MAX_PROPOSALS_PER_PARTICIPANT = 15;

export const DEFAULT_VOTE_LIMIT = 3;

export const DEFAULT_PARTICIPANT_LIMIT = 10;

export const DEFAULT_PROPOSAL_LIMIT = 3;

export const DEFAULT_EVENT_CONFIG: EventConfigData = {
  theme: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  maxVotesPerParticipant: null,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
  recurrence: null,
  winnerCount: 1,
};

export const MAX_EVENT_TEMPLATES = 5;

export const MAX_EVENT_TEMPLATE_NAME_LENGTH = 60;

export type EventTemplateData = ApiSchemas['EventTemplateResponse'];

export type SaveEventTemplateBody = Omit<EventTemplateData, 'id'>;

export const MAX_WINNERS_PER_EVENT = 10;

export type EventConfigPatchPayload = {
  title?: string;
  theme?: string;
  maxProposalsPerParticipant?: number;
  maxParticipants?: number;
  maxVotesPerParticipant?: number;
  wheelMode?: WheelMode;
  richSharePreview?: boolean;
  allowSeries?: boolean;
  winnerCount?: number;
  recurrence?: EventRecurrence;
  clearRecurrence?: boolean;
  groupId?: string;
  clearGroup?: boolean;
  date?: string;
  time?: string;
  notifyParticipantsOfDateChange?: boolean;
};

export type MyEventsScope = 'active' | 'finished';

export type MyEventSummary = ApiSchemas['MyEventSummaryDto'];

export type MyEventMoviePreview = ApiSchemas['MyEventMoviePreviewDto'];

export type MyEventWinnerMovie = ApiSchemas['MyEventWinnerMovieDto'];

export type MyEventsListResponse = ApiSchemas['MyEventsListResponse'];
