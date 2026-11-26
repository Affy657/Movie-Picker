import type { ApiSchemas } from '@/shared/api/contract';

type WatchedMovie = ApiSchemas['UserWatchedMovieItem'];
type ShowcaseItem = ApiSchemas['MovieShowcaseItemResponse'];
type SearchItem = ApiSchemas['MovieSearchItemResponse'];

type Titled<T extends { title: string }, Id extends keyof T> = Pick<T, Id | 'title'> & Partial<T>;

type ShowcaseSection = ApiSchemas['MovieShowcaseListResponse']['section'];

export function requestedShowcaseSection(request: Request): ShowcaseSection {
  return (new URL(request.url).searchParams.get('section') ?? 'trending') as ShowcaseSection;
}

export function buildWatchedMovie(film: Titled<WatchedMovie, 'tmdbId'>): WatchedMovie {
  return {
    year: '',
    posterPath: null,
    voteAverage: null,
    runtimeMinutes: null,
    genreIds: [],
    mediaType: 'movie',
    watchedAt: '2026-11-01T20:00:00Z',
    myRating: null,
    source: 'elsewhere',
    ...film,
  };
}

export function buildShowcaseItem(film: Titled<ShowcaseItem, 'id'>): ShowcaseItem {
  return {
    mediaType: 'movie',
    year: '',
    posterPath: null,
    voteAverage: null,
    runtimeMinutes: null,
    genreIds: [],
    rank: null,
    eventCount: null,
    ...film,
  };
}

export function buildSearchItem(film: Titled<SearchItem, 'id'>): SearchItem {
  return {
    mediaType: 'movie',
    year: '',
    posterPath: null,
    voteAverage: null,
    runtimeMinutes: null,
    watchProviders: null,
    tmdbWatchPageUrl: null,
    genreIds: [],
    ...film,
  };
}
