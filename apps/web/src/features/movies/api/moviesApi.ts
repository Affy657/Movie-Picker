import { fetchApi } from '@/shared/api/client';
import { mapMovieData, type RawMovieData } from '@/shared/api/apiMapping';
import type { MovieData, MovieMediaType, WatchProviderOffer } from '@/shared/types/movie';

export async function fetchEventMovies(
  slug: string,
  participantId?: string | null
): Promise<MovieData[]> {
  const suffix = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';
  const list = await fetchApi<RawMovieData[]>(`/events/${slug}/movies${suffix}`);
  return Array.isArray(list) ? list.map(mapMovieData) : [];
}

export interface MovieSearchItem {
  id: number;
  mediaType?: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  watchProviders?: WatchProviderOffer[];
  tmdbWatchPageUrl?: string | null;
}

export interface MovieSearchListResponse {
  items: MovieSearchItem[];
  watchProvidersRegion: string;
  disclaimer: string;
  tmdbAttributionUrl: string;
}

export async function searchMovies(
  query: string,
  opts?: { signal?: AbortSignal; lang?: string; eventSlug?: string }
): Promise<MovieSearchListResponse> {
  const params = new URLSearchParams({ q: query.trim() });
  if (opts?.lang) params.set('lang', opts.lang);
  if (opts?.eventSlug) params.set('eventSlug', opts.eventSlug);

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

export interface MovieDetails {
  tmdbId: number;
  mediaType?: MovieMediaType;
  title: string;
  overview: string | null;
  tagline: string | null;
  director: string | null;
  cast: string[];
  runtimeMinutes: number | null;
  genres: string[];
  releaseDate: string | null;
  trailerUrl?: string | null;
}

interface RawMovieDetailsResponse {
  tmdbId?: number;
  mediaType?: MovieMediaType;
  title?: string;
  overview?: string | null;
  tagline?: string | null;
  director?: string | null;
  cast?: string[] | null;
  runtimeMinutes?: number | null;
  genres?: string[] | null;
  releaseDate?: string | null;
  trailerUrl?: string | null;
}

export async function fetchMovieDetails(
  tmdbId: number,
  opts?: { signal?: AbortSignal; mediaType?: MovieMediaType }
): Promise<MovieDetails> {
  const params = new URLSearchParams();
  if (opts?.mediaType) params.set('mediaType', opts.mediaType);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const raw = await fetchApi<RawMovieDetailsResponse>(
    `/movies/tmdb/${tmdbId}/details${qs}`,
    opts?.signal ? { signal: opts.signal } : undefined
  );
  return {
    tmdbId: raw.tmdbId ?? tmdbId,
    mediaType: raw.mediaType,
    title: raw.title ?? '',
    overview: raw.overview ?? null,
    tagline: raw.tagline ?? null,
    director: raw.director ?? null,
    cast: Array.isArray(raw.cast) ? raw.cast : [],
    runtimeMinutes: raw.runtimeMinutes ?? null,
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    releaseDate: raw.releaseDate ?? null,
    trailerUrl: raw.trailerUrl ?? null,
  };
}

export async function addMovieToEvent(
  slug: string,
  body: {
    tmdbId: number;
    mediaType?: MovieMediaType;
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

export async function clearMovieVote(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  const search = new URLSearchParams({ participantId });
  await fetchApi(`/events/${slug}/movies/${movieId}/vote?${search.toString()}`, {
    method: 'DELETE',
  });
}

export async function removeMovieFromEvent(
  slug: string,
  movieId: string,
  participantId: string,
  hostToken?: string | null
): Promise<void> {
  const suffix = hostToken ? `?host=${encodeURIComponent(hostToken)}` : '';
  await fetchApi(`/events/${slug}/movies/${movieId}${suffix}`, {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  });
}

export async function setMoviePitchNote(
  slug: string,
  movieId: string,
  participantId: string,
  pitchNote: string
): Promise<void> {
  await fetchApi(`/events/${slug}/movies/${movieId}/note`, {
    method: 'PUT',
    body: JSON.stringify({ participantId, pitchNote }),
  });
}

export async function deleteMoviePitchNote(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  await fetchApi(`/events/${slug}/movies/${movieId}/note`, {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  });
}

export async function markMovieAsSeen(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  await fetchApi(`/events/${slug}/movies/${movieId}/seen`, {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
}

export async function unmarkMovieAsSeen(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  await fetchApi(`/events/${slug}/movies/${movieId}/seen`, {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  });
}
