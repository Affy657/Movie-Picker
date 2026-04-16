/** Offre VOD/streaming TMDB (région configurée côté API, ex. FR). */
export interface WatchProviderOffer {
  providerId: number;
  name: string;
  logoPath: string | null;
  type: string;
}

export interface MovieData {
  id: string;
  eventId: string;
  /**
   * L'API renvoie un `string` (ID brut) lorsque le film est peuplé via le endpoint movies,
   * mais un objet `{ id, pseudo }` lorsque le participant est « populated » dans certaines
   * réponses legacy. Utiliser `getParticipantId()` (`@/shared/utils/movieParticipant`) pour
   * extraire l'ID de manière sûre.
   */
  participantId: string | { id: string; pseudo: string };
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
  /** Durée du film en minutes (TMDB) — formatée côté UI en « 1h10 ». */
  runtimeMinutes?: number | null;
  /** Nombre de participants ayant marqué « déjà vu ». */
  seenCount?: number;
  /** Pseudos (ordre stable, tronqué côté API) des participants ayant marqué « déjà vu ». */
  seenByPseudos?: string[];
}

export interface ParticipantData {
  id: string;
  eventId: string;
  pseudo: string;
}
