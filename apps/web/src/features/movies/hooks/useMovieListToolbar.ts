import { useCallback, useEffect, useMemo, useState } from 'react';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import { DECADE_OPTIONS } from '@/features/movies/components/movieSearchFilterOptions';
import type { MovieMediaType } from '@/shared/types/movie';

export type MovieListSortKey = 'primary' | 'title' | 'year';
export type SortDirection = 'asc' | 'desc';

export interface MovieListItemLike {
  tmdbId: number;
  title: string;
  year: string;
  posterPath: string | null;
  genreIds: number[];
  mediaType: MovieMediaType;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
}

const DEFAULT_DIRECTION: Record<MovieListSortKey, SortDirection> = {
  primary: 'desc',
  title: 'asc',
  year: 'desc',
};

const INITIAL_REVEAL_COUNT = 24;

interface FilterState {
  genres: number[];
  mediaTypes: MovieMediaType[];
  decade: string | undefined;
}

const DEFAULT_FILTERS: FilterState = {
  genres: [],
  mediaTypes: [],
  decade: undefined,
};

function itemMatchesSearch(item: MovieListItemLike, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.title.toLowerCase().includes(q);
}

function itemMatchesFilters(item: MovieListItemLike, f: FilterState): boolean {
  if (f.genres.length > 0 && !item.genreIds.some((g) => f.genres.includes(g))) return false;
  if (f.mediaTypes.length > 0 && !f.mediaTypes.includes(item.mediaType)) return false;
  if (f.decade != null) {
    const year = Number.parseInt(item.year, 10);
    const from = Number.parseInt(f.decade, 10);
    if (Number.isNaN(year) || year < from || year > from + 9) return false;
  }
  return true;
}

export interface ActiveToolbarChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface UseMovieListToolbarOptions<T extends MovieListItemLike> {
  items: T[];
  tmdbLanguage: string;
  mediaTypeLabels: Record<MovieMediaType, string>;
  comparePrimary: (a: T, b: T) => number;
}

export function useMovieListToolbar<T extends MovieListItemLike>({
  items,
  tmdbLanguage,
  mediaTypeLabels,
  comparePrimary,
}: UseMovieListToolbarOptions<T>) {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<{ by: MovieListSortKey; dir: SortDirection }>({
    by: 'primary',
    dir: 'desc',
  });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [revealCount, setRevealCount] = useState(INITIAL_REVEAL_COUNT);
  const sortBy = sort.by;
  const sortDir = sort.dir;

  const setSortBy = useCallback((key: MovieListSortKey) => {
    setSort((prev) =>
      prev.by === key
        ? { by: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { by: key, dir: DEFAULT_DIRECTION[key] }
    );
  }, []);

  const toggleGenre = useCallback((id: number) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(id) ? prev.genres.filter((g) => g !== id) : [...prev.genres, id],
    }));
  }, []);

  const removeGenre = useCallback((id: number) => {
    setFilters((prev) => ({ ...prev, genres: prev.genres.filter((g) => g !== id) }));
  }, []);

  const toggleMediaType = useCallback((mediaType: MovieMediaType) => {
    setFilters((prev) => ({
      ...prev,
      mediaTypes: prev.mediaTypes.includes(mediaType)
        ? prev.mediaTypes.filter((m) => m !== mediaType)
        : [...prev.mediaTypes, mediaType],
    }));
  }, []);

  const toggleDecade = useCallback((decade: string) => {
    setFilters((prev) => ({ ...prev, decade: prev.decade === decade ? undefined : decade }));
  }, []);

  const clearAllFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const resetAll = useCallback(() => {
    setSearch('');
    clearAllFilters();
  }, [clearAllFilters]);

  const hasActiveFilters = useMemo(
    () => filters.genres.length > 0 || filters.mediaTypes.length > 0 || filters.decade != null,
    [filters]
  );

  const isFiltered = hasActiveFilters || search.trim() !== '';

  const activeFilterChips = useMemo<ActiveToolbarChip[]>(() => {
    const chips: ActiveToolbarChip[] = [];
    for (const id of filters.genres) {
      chips.push({
        key: `g-${id}`,
        label: genreLabel(id, tmdbLanguage),
        onRemove: () => removeGenre(id),
      });
    }
    for (const mediaType of filters.mediaTypes) {
      chips.push({
        key: `t-${mediaType}`,
        label: mediaTypeLabels[mediaType],
        onRemove: () => toggleMediaType(mediaType),
      });
    }
    if (filters.decade != null) {
      chips.push({
        key: 'decade',
        label: `${filters.decade}s`,
        onRemove: () => setFilters((prev) => ({ ...prev, decade: undefined })),
      });
    }
    return chips;
  }, [filters, tmdbLanguage, mediaTypeLabels, removeGenre, toggleMediaType]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter(
      (item) => itemMatchesFilters(item, filters) && itemMatchesSearch(item, search)
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'title')
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      if (sortBy === 'year')
        return (Number.parseInt(a.year, 10) || 0) - (Number.parseInt(b.year, 10) || 0);
      return comparePrimary(a, b);
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [items, filters, search, sortBy, sortDir, comparePrimary]);

  useEffect(() => {
    setRevealCount(INITIAL_REVEAL_COUNT);
  }, [search, filters, sortBy, sortDir]);

  const revealedItems = useMemo(
    () => visibleItems.slice(0, revealCount),
    [visibleItems, revealCount]
  );

  const remainingCount = Math.max(0, visibleItems.length - revealedItems.length);

  const revealMore = useCallback(() => {
    setRevealCount((prev) => prev + visibleItems.length);
  }, [visibleItems.length]);

  return {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    sortBy,
    sortDir,
    setSortBy,
    selectedGenres: filters.genres,
    toggleGenre,
    selectedMediaTypes: filters.mediaTypes,
    toggleMediaType,
    selectedDecade: filters.decade,
    toggleDecade,
    clearAllFilters,
    resetAll,
    hasActiveFilters,
    isFiltered,
    activeFilterChips,
    visibleItems,
    revealedItems,
    remainingCount,
    revealMore,
    visibleCount: visibleItems.length,
    totalCount: items.length,
    decadeOptions: DECADE_OPTIONS,
  };
}
