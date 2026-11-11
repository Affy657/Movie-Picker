import type { MovieSearchFilters, MovieSearchItem } from '@/features/movies/api/moviesApi';

function within(value: number | null | undefined, min?: number, max?: number): boolean {
  if (min === undefined && max === undefined) return true;
  if (value === null || value === undefined || Number.isNaN(value)) return false;
  if (min !== undefined && value < min) return false;
  return max === undefined || value <= max;
}

export function matchesSearchFilters(
  item: MovieSearchItem,
  filters: MovieSearchFilters,
  availability?: string
): boolean {
  if (availability && !(item.watchProviders ?? []).some((p) => p.type === availability)) {
    return false;
  }
  const genres = filters.genreIds ?? [];
  if (genres.length > 0 && !(item.genreIds ?? []).some((id) => genres.includes(id))) {
    return false;
  }
  return (
    within(Number.parseInt(item.year, 10), filters.yearFrom, filters.yearTo) &&
    within(item.voteAverage, filters.voteMin) &&
    within(item.runtimeMinutes, filters.runtimeMin, filters.runtimeMax)
  );
}
