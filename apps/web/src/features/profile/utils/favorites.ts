import type { FavoriteTitle, TitleSummary } from '@/shared/types/movie';

export function favoriteOf(title: TitleSummary): FavoriteTitle {
  const { tmdbId, mediaType, title: name, year, posterPath } = title;
  return { tmdbId, mediaType, title: name, year, posterPath };
}

export function isSameFavorite(
  a: Pick<FavoriteTitle, 'tmdbId' | 'mediaType'>,
  b: Pick<FavoriteTitle, 'tmdbId' | 'mediaType'>
): boolean {
  return a.tmdbId === b.tmdbId && a.mediaType === b.mediaType;
}
