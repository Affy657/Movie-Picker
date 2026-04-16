import type { MovieData } from '@/shared/types/movie';

/** Aligné sur `MyEventSummaryDto.Lifecycle` (API) : upcoming | live | finished */
export type MyEventLifecycle = 'upcoming' | 'live' | 'finished';

/** Aligné sur l'enum API `WheelMode` (JSON camelCase). */
export type WheelMode = 'strictRandom' | 'weightedByVotes';

/** Aligné sur `EventConfigResponse` (API). */
export interface EventConfigData {
  theme: string | null;
  endDate: string | null;
  maxProposalsPerParticipant: number | null;
  /** Capacité maximale de participants ; `null` = pas de limite. */
  maxParticipants: number | null;
  wheelMode: WheelMode;
  /** Aperçu de lien détaillé (Open Graph) — défaut API : false. */
  richSharePreview?: boolean;
}

export interface EventParticipantSummary {
  id: string;
  pseudo: string;
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
  /** Toujours présent sur l'API à jour ; défaut local si absent (tests / vieux mocks). */
  config?: EventConfigData;
  /** Participant du compte connecté pour cette soirée (détail événement authentifié). */
  myParticipant?: { id: string; pseudo: string } | null;
  /** Nombre de participants (détail / liste à jour). */
  participantCount?: number;
  /** Nombre de films proposés (détail / liste à jour). */
  movieCount?: number;
  /** Liste des participants (pseudo), triés par ordre d'arrivée. */
  participants?: EventParticipantSummary[];
}
