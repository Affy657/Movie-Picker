import type { MyEventLifecycle } from '@/shared/types/event';

export type { WheelMode, EventConfigData, EventData } from '@/shared/types/event';
import type { EventConfigData, WheelMode } from '@/shared/types/event';

export const DEFAULT_EVENT_CONFIG: EventConfigData = {
  theme: null,
  endDate: null,
  maxProposalsPerParticipant: null,
  wheelMode: 'strictRandom',
  richSharePreview: false,
};

/** Corps PATCH config soirée (formulaire hôte — aligné sur l'API). */
export type EventConfigPatchPayload = {
  theme: string;
  endDate?: string | null;
  maxProposalsPerParticipant: number;
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
