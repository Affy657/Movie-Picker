/** Aligné sur l’enum API `WheelMode` (JSON camelCase). */
export type WheelMode = 'strictRandom' | 'weightedByVotes';

/** Aligné sur `EventConfigResponse` (API). */
export interface EventConfigData {
  theme: string | null;
  endDate: string | null;
  maxProposalsPerParticipant: number | null;
  wheelMode: WheelMode;
  allowedReactionIds: string[] | null;
}

export const DEFAULT_EVENT_CONFIG: EventConfigData = {
  theme: null,
  endDate: null,
  maxProposalsPerParticipant: null,
  wheelMode: 'strictRandom',
  allowedReactionIds: null,
};

export interface EventData {
  _id: string;
  title: string;
  date: string;
  time: string;
  slug: string;
  isHost?: boolean;
  terminé?: boolean;
  closedAt?: string | null;
  winnerMovie?: MovieData | null;
  /** Toujours présent sur l’API à jour ; défaut local si absent (tests / vieux mocks). */
  config?: EventConfigData;
}

/** Offre VOD/streaming TMDB (région configurée côté API, ex. FR). */
export interface WatchProviderOffer {
  providerId: number;
  name: string;
  logoPath: string | null;
  type: string;
}

/** Agrégat aligné sur `MovieReactionAggregateResponse` (API). */
export interface MovieReactionAggregate {
  reactionId: string;
  count: number;
  pseudos: string[];
}

export interface MovieData {
  _id: string;
  eventId: string;
  participantId: string | { _id: string; pseudo: string };
  tmdbId: number;
  title: string;
  year: string;
  posterPath: string | null;
  proposerPseudo: string;
  score: number;
  up: number;
  down: number;
  voteAverage?: number | null;
  watchProviders?: WatchProviderOffer[];
  tmdbWatchPageUrl?: string | null;
  /** Agrégats de réactions (liste vide si aucune). */
  reactions?: MovieReactionAggregate[];
}

export interface ParticipantData {
  _id: string;
  eventId: string;
  pseudo: string;
}

const PARTICIPANT_KEY = 'moviepicker_participant_';

export function getStoredParticipant(
  slug: string
): { participantId: string; pseudo: string } | null {
  try {
    const raw = sessionStorage.getItem(PARTICIPANT_KEY + slug);
    if (!raw) return null;
    const data = JSON.parse(raw) as { participantId: string; pseudo: string };
    return data.participantId && data.pseudo ? data : null;
  } catch {
    return null;
  }
}

export function setStoredParticipant(slug: string, participantId: string, pseudo: string): void {
  sessionStorage.setItem(PARTICIPANT_KEY + slug, JSON.stringify({ participantId, pseudo }));
}

const HOST_KEY = 'moviepicker_host_';

export function getStoredHostToken(slug: string): string | null {
  try {
    return sessionStorage.getItem(HOST_KEY + slug);
  } catch {
    return null;
  }
}

export function setStoredHostToken(slug: string, token: string): void {
  sessionStorage.setItem(HOST_KEY + slug, token);
}
