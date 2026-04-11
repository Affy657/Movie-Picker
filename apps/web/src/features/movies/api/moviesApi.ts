import { fetchApi } from '@/shared/api/client';
import { mapMovieData, type RawMovieData } from '@/shared/api/apiMapping';
import type { MovieData, WatchProviderOffer } from '@/shared/types/movie';

export async function fetchEventMovies(slug: string): Promise<MovieData[]> {
  const list = await fetchApi<RawMovieData[]>(`/events/${slug}/movies`);
  return Array.isArray(list) ? list.map(mapMovieData) : [];
}

export interface MovieSearchItem {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  watchProviders?: WatchProviderOffer[];
  tmdbWatchPageUrl?: string | null;
}

export interface MovieSearchListResponse {
  items: MovieSearchItem[];
  watchProvidersRegion: string;
  disclaimer: string;
  tmdbAttributionUrl: string;
}

/**
 * Réponse unifiée : l’API peut renvoyer soit `{ items, ... }` soit un tableau legacy ;
 * le client normalise toujours vers `MovieSearchListResponse`.
 */
export async function searchMovies(
  query: string,
  opts?: { signal?: AbortSignal; lang?: string }
): Promise<MovieSearchListResponse> {
  const params = new URLSearchParams({ q: query.trim() });
  if (opts?.lang) params.set('lang', opts.lang);

  const raw = await fetchApi<MovieSearchListResponse | MovieSearchItem[]>(
    `/movies/search?${params.toString()}`,
    opts?.signal ? { signal: opts.signal } : undefined
  );
  if (Array.isArray(raw)) {
    return {
      items: raw,
      watchProvidersRegion: '',
      disclaimer: '',
      tmdbAttributionUrl: '',
    };
  }
  return {
    items: raw.items ?? [],
    watchProvidersRegion: raw.watchProvidersRegion ?? '',
    disclaimer: raw.disclaimer ?? '',
    tmdbAttributionUrl: raw.tmdbAttributionUrl ?? '',
  };
}

export async function addMovieToEvent(
  slug: string,
  body: {
    tmdbId: number;
    title: string;
    year: string;
    posterPath: string | null;
    participantId: string;
  }
): Promise<void> {
  await fetchApi(`/events/${slug}/movies`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function voteMovie(
  slug: string,
  movieId: string,
  participantId: string,
  value: number
): Promise<void> {
  await fetchApi(`/events/${slug}/movies/${movieId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ participantId, value }),
  });
}

export async function removeMovieFromEvent(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  await fetchApi(`/events/${slug}/movies/${movieId}`, {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  });
}

export async function addMovieReaction(
  slug: string,
  movieId: string,
  participantId: string,
  reactionId: string
): Promise<void> {
  await fetchApi(`/events/${slug}/movies/${movieId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ participantId, reactionId }),
  });
}

export async function removeMovieReaction(
  slug: string,
  movieId: string,
  participantId: string,
  reactionId: string
): Promise<void> {
  await fetchApi(`/events/${slug}/movies/${movieId}/reactions/${encodeURIComponent(reactionId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  });
}
