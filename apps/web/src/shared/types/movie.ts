export interface WatchProviderOffer {
  providerId: number;
  name: string;
  logoPath: string | null;
  type: string;
}

export type MovieMediaType = 'movie' | 'tv';

export interface MovieData {
  id: string;
  eventId: string;

  participantId: string | { id: string; pseudo: string };
  tmdbId: number;
  mediaType?: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  pitchNote?: string | null;
  excludedFromWheel?: boolean;
  genreIds?: number[];
  proposerPseudo: string;
  proposerHandle?: string | null;
  score: number;
  up: number;
  down: number;

  myVote?: 1 | -1 | null;
  voteAverage?: number | null;
  watchProviders?: WatchProviderOffer[];
  tmdbWatchPageUrl?: string | null;

  runtimeMinutes?: number | null;
  releaseDate?: string | null;

  createdAt?: string;

  seenCount?: number;

  seenByPseudos?: string[];

  votersUpPseudos?: string[];
}

export interface ParticipantData {
  id: string;
  eventId: string;
  pseudo: string;
}
