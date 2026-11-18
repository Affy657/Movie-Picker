import { fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import type { MovieMediaType } from '@/shared/types/movie';

export const SHOWCASE_STALE_TIME = 1000 * 60 * 30;

export type ShowcaseSection = ShowcaseListResponse['section'];

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

export type ShowcaseItem = ApiSchemas['MovieShowcaseItemResponse'];

export type ShowcaseListResponse = ApiSchemas['MovieShowcaseListResponse'];

export type MovieCollection = ApiSchemas['MovieCollectionResponse'];

export type ShowcaseThemePreview = ApiSchemas['MovieShowcaseThemeResponse'];

export type MovieCollectionListResponse = ApiSchemas['MovieCollectionListResponse'];

export interface ShowcaseQuery {
  section: ShowcaseSection;
  theme?: ShowcaseTheme;
  genreIds?: number[];
  collectionId?: number;
  provider?: ShowcaseProvider;
  seedTmdbId?: number;
  seedMediaType?: MovieMediaType;
  personId?: number;
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
    query.seedMediaType ?? 'movie',
    query.personId ?? 0,
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
  if (query.seedMediaType === 'tv') params.set('seedMediaType', 'tv');
  if (query.personId != null) params.set('personId', String(query.personId));

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

export async function fetchShowcaseThemes(signal?: AbortSignal): Promise<ShowcaseThemePreview[]> {
  const raw = await fetchApi<ApiSchemas['MovieShowcaseThemeListResponse']>(
    '/movies/showcase/themes',
    signal ? { signal } : undefined
  );
  return (raw.items ?? []).map((item) => ({ theme: item.theme, posters: item.posters ?? [] }));
}
