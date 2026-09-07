import { fetchApi } from '@/shared/api/client';
import type { MovieMediaType } from '@/shared/types/movie';

export type ShowcaseSection =
  | 'trending'
  | 'now-playing'
  | 'most-proposed'
  | 'theme'
  | 'collection'
  | 'provider'
  | 'recommendations';

export const SHOWCASE_THEMES = [
  'frissons',
  'comedies-francaises',
  'annees-80',
  'annees-90',
  'annees-2000',
  'braquages',
  'pepites-a24',
  'moins-de-90-min',
  'indetronables',
  'en-famille',
] as const;

export type ShowcaseTheme = (typeof SHOWCASE_THEMES)[number];

export const SHOWCASE_PROVIDERS = [
  'netflix',
  'prime-video',
  'disney-plus',
  'canal-plus',
  'apple-tv-plus',
] as const;

export type ShowcaseProvider = (typeof SHOWCASE_PROVIDERS)[number];

export interface ShowcaseItem {
  id: number;
  mediaType?: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  genreIds?: number[];
  rank?: number | null;
  eventCount?: number | null;
}

export interface ShowcaseListResponse {
  section: string;
  theme: string | null;
  items: ShowcaseItem[];
  disclaimer: string;
  tmdbAttributionUrl: string;
}

export interface MovieCollection {
  id: number;
  name: string;
  overview: string | null;
  posterPath: string | null;
  movieCount: number;
}

export interface MovieCollectionListResponse {
  items: MovieCollection[];
  disclaimer: string;
  tmdbAttributionUrl: string;
}

export interface ShowcaseQuery {
  section: ShowcaseSection;
  theme?: ShowcaseTheme;
  genreIds?: number[];
  collectionId?: number;
  provider?: ShowcaseProvider;
  seedTmdbId?: number;
}

export function showcaseQueryKey(query: ShowcaseQuery): readonly unknown[] {
  return [
    'movies',
    'showcase',
    query.section,
    query.theme ?? '',
    (query.genreIds ?? []).join(','),
    query.collectionId ?? 0,
    query.provider ?? '',
    query.seedTmdbId ?? 0,
  ] as const;
}

export async function fetchMovieShowcase(
  query: ShowcaseQuery,
  signal?: AbortSignal
): Promise<ShowcaseListResponse> {
  const params = new URLSearchParams({ section: query.section });
  if (query.theme) params.set('theme', query.theme);
  if (query.genreIds?.length) params.set('genreIds', query.genreIds.join(','));
  if (query.collectionId != null) params.set('collectionId', String(query.collectionId));
  if (query.provider) params.set('provider', query.provider);
  if (query.seedTmdbId != null) params.set('seedTmdbId', String(query.seedTmdbId));

  const raw = await fetchApi<ShowcaseListResponse>(
    `/movies/showcase?${params.toString()}`,
    signal ? { signal } : undefined
  );
  return {
    section: raw.section ?? query.section,
    theme: raw.theme ?? null,
    items: raw.items ?? [],
    disclaimer: raw.disclaimer ?? '',
    tmdbAttributionUrl: raw.tmdbAttributionUrl ?? '',
  };
}

export async function fetchMovieCollections(
  signal?: AbortSignal
): Promise<MovieCollectionListResponse> {
  const raw = await fetchApi<MovieCollectionListResponse>(
    '/movies/collections',
    signal ? { signal } : undefined
  );
  return {
    items: raw.items ?? [],
    disclaimer: raw.disclaimer ?? '',
    tmdbAttributionUrl: raw.tmdbAttributionUrl ?? '',
  };
}
