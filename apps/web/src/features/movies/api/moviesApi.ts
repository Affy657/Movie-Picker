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
  genreIds?: number[];
}

export interface MovieSearchListResponse {
  items: MovieSearchItem[];
  watchProvidersRegion: string;
  disclaimer: string;
  tmdbAttributionUrl: string;
}

export interface MovieSearchFilters {
  genreIds?: number[];
  yearFrom?: number;
  yearTo?: number;
  voteMin?: number;
  originalLanguage?: string;
  runtimeMin?: number;
  runtimeMax?: number;
}

export async function searchMovies(
  query: string,
  opts?: { signal?: AbortSignal; lang?: string; eventSlug?: string; filters?: MovieSearchFilters }
): Promise<MovieSearchListResponse> {
  const params = new URLSearchParams({ q: query.trim() });
  if (opts?.lang) params.set('lang', opts.lang);
  if (opts?.eventSlug) params.set('eventSlug', opts.eventSlug);
  if (opts?.filters?.genreIds?.length) params.set('genreIds', opts.filters.genreIds.join(','));
  if (opts?.filters?.yearFrom != null) params.set('yearFrom', String(opts.filters.yearFrom));
  if (opts?.filters?.yearTo != null) params.set('yearTo', String(opts.filters.yearTo));
  if (opts?.filters?.voteMin != null) params.set('voteMin', String(opts.filters.voteMin));
  if (opts?.filters?.originalLanguage) params.set('language', opts.filters.originalLanguage);
  if (opts?.filters?.runtimeMin != null) params.set('runtimeMin', String(opts.filters.runtimeMin));
  if (opts?.filters?.runtimeMax != null) params.set('runtimeMax', String(opts.filters.runtimeMax));

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
  watchProviders: WatchProviderOffer[];
  tmdbWatchPageUrl: string | null;
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
  watchProviders?: WatchProviderOffer[] | null;
  tmdbWatchPageUrl?: string | null;
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
    watchProviders: Array.isArray(raw.watchProviders) ? raw.watchProviders : [],
    tmdbWatchPageUrl: raw.tmdbWatchPageUrl ?? null,
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

export async function setMovieWheelExclusion(
  slug: string,
  movieId: string,
  excluded: boolean,
  hostToken?: string | null
): Promise<void> {
  const suffix = hostToken ? `?host=${encodeURIComponent(hostToken)}` : '';
  await fetchApi(`/events/${slug}/movies/${movieId}/wheel-exclusion${suffix}`, {
    method: 'PUT',
    body: JSON.stringify({ excluded }),
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
