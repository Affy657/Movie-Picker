import { fetchApi, apiPath } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import type { MovieMediaType } from '@/shared/types/movie';

type QueryString = '' | `?${string}`;

export type MovieSearchItem = ApiSchemas['MovieSearchItemResponse'];

export type MovieSearchListResponse = ApiSchemas['MovieSearchListResponse'];

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
  opts?: {
    signal?: AbortSignal;
    lang?: string;
    eventSlug?: string;
    includeSeries?: boolean;
    filters?: MovieSearchFilters;
  }
): Promise<MovieSearchListResponse> {
  const params = new URLSearchParams({ q: query.trim() });
  if (opts?.lang) params.set('lang', opts.lang);
  if (opts?.eventSlug) params.set('eventSlug', opts.eventSlug);
  if (opts?.includeSeries) params.set('includeSeries', 'true');
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

export type MovieDetails = ApiSchemas['MovieDetailsResponse'];

export type MovieCollectionRef = ApiSchemas['MovieDetailsCollectionResponse'];

export type MovieCastMember = ApiSchemas['MovieCastMemberResponse'];

export type MovieCrewMember = ApiSchemas['MovieCrewMemberResponse'];

export type MovieCrewJob = MovieCrewMember['job'];

export type MovieVideo = ApiSchemas['MovieVideoResponse'];

type RawMovieDetailsResponse = { [K in keyof MovieDetails]?: MovieDetails[K] | null };

function listOrEmpty<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function mapPageFields(raw: RawMovieDetailsResponse) {
  return {
    originalTitle: raw.originalTitle ?? null,
    originalLanguage: raw.originalLanguage ?? null,
    productionCountries: listOrEmpty(raw.productionCountries),
    budget: raw.budget ?? null,
    voteCount: raw.voteCount ?? null,
    certification: raw.certification ?? null,
    collection: raw.collection ?? null,
    directorId: raw.directorId ?? null,
    castMembers: listOrEmpty(raw.castMembers),
    crew: listOrEmpty(raw.crew),
    videos: listOrEmpty(raw.videos),
  };
}

export async function fetchMovieDetails(
  tmdbId: number,
  opts?: { signal?: AbortSignal; mediaType?: MovieMediaType }
): Promise<MovieDetails> {
  const params = new URLSearchParams();
  if (opts?.mediaType) params.set('mediaType', opts.mediaType);
  const qs: QueryString = params.toString() ? `?${params.toString()}` : '';
  const raw = await fetchApi<RawMovieDetailsResponse>(
    `${apiPath('movies', 'tmdb', tmdbId, 'details')}${qs}`,
    opts?.signal ? { signal: opts.signal } : undefined
  );
  return {
    tmdbId: raw.tmdbId ?? tmdbId,
    mediaType: raw.mediaType ?? opts?.mediaType ?? 'movie',
    title: raw.title ?? '',
    overview: raw.overview ?? null,
    tagline: raw.tagline ?? null,
    director: raw.director ?? null,
    cast: Array.isArray(raw.cast) ? raw.cast : [],
    runtimeMinutes: raw.runtimeMinutes ?? null,
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    releaseDate: raw.releaseDate ?? null,
    trailerUrl: raw.trailerUrl ?? null,
    voteAverage: raw.voteAverage ?? null,
    posterPath: raw.posterPath ?? null,
    backdropPath: raw.backdropPath ?? null,
    seasonCount: raw.seasonCount ?? null,
    episodeCount: raw.episodeCount ?? null,
    watchProviders: Array.isArray(raw.watchProviders) ? raw.watchProviders : [],
    tmdbWatchPageUrl: raw.tmdbWatchPageUrl ?? null,
    ...mapPageFields(raw),
  };
}

export type MovieNight = ApiSchemas['MovieNightResponse'];

export type MovieNights = ApiSchemas['MovieNightsResponse'];

type RawMovieNights = Partial<{ [K in keyof MovieNights]: MovieNights[K] | null }>;

export async function fetchMovieNights(
  tmdbId: number,
  opts?: { signal?: AbortSignal; mediaType?: MovieMediaType }
): Promise<MovieNights> {
  const qs: QueryString = opts?.mediaType ? `?mediaType=${opts.mediaType}` : '';
  const raw = await fetchApi<RawMovieNights>(
    `${apiPath('movies', 'tmdb', tmdbId, 'nights')}${qs}`,
    opts?.signal ? { signal: opts.signal } : undefined
  );
  return {
    nights: listOrEmpty(raw.nights),
    proposalCount: raw.proposalCount ?? 0,
    winCount: raw.winCount ?? 0,
    rating: raw.rating ?? null,
    seenBy: listOrEmpty(raw.seenBy),
    seenCount: raw.seenCount ?? 0,
  };
}
