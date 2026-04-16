import type { MyEventLifecycle } from '@/shared/types/event';

export type { WheelMode, EventConfigData, EventData } from '@/shared/types/event';
import type { EventConfigData, WheelMode } from '@/shared/types/event';

/** Plafond max pour `maxParticipants` (aligné sur `EventConfig.MaxParticipantsCap` côté API). */
export const MAX_EVENT_PARTICIPANTS = 500;

/** Plafond max pour `maxProposalsPerParticipant` (aligné sur `EventConfig.MaxProposalsPerParticipantCap` côté API). */
export const MAX_PROPOSALS_PER_PARTICIPANT = 100;

export const DEFAULT_EVENT_CONFIG: EventConfigData = {
  theme: null,
  endDate: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  wheelMode: 'strictRandom',
  richSharePreview: false,
};

/** Corps PATCH config soirée (formulaire hôte — aligné sur l'API). */
export type EventConfigPatchPayload = {
  theme: string;
  endDate?: string | null;
  maxProposalsPerParticipant: number;
  /** 0 = pas de limite, 1–500 sinon. */
  maxParticipants: number;
  wheelMode: WheelMode;
  richSharePreview: boolean;
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
  /** Présent sur API à jour ; normaliser côté UI si absent. */
  lifecycle?: MyEventLifecycle | string;
  participantCount?: number;
  movieCount?: number;
}

export interface MyEventsListResponse {
  events: MyEventSummary[];
  /** Invité : nombre de slugs en session pour lesquels le détail n’a pas pu être chargé. */
  guestSkippedCount?: number;
}
