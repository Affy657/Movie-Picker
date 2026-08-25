import { genreLabel } from '@/features/profile/lib/tmdbGenres';

const MAX_META_GENRES = 2;

export function metaGenresLabel(genreIds: number[] | undefined, locale: string): string | null {
  if (!genreIds?.length) return null;
  return genreIds
    .slice(0, MAX_META_GENRES)
    .map((id) => genreLabel(id, locale))
    .join(', ');
}

export function movieMetaLine(
  year: string | undefined,
  genresLabel: string | null,
  runtimeLabel: string | null
): string | null {
  const parts = [year, genresLabel, runtimeLabel].filter((part): part is string => !!part);
  return parts.length ? parts.join(', ') : null;
}
