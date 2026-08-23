import { useCallback, useEffect, useMemo, useState } from 'react';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import { DECADE_OPTIONS } from '@/features/movies/components/movieSearchFilterOptions';
import type { MovieMediaType } from '@/shared/types/movie';
import type { UserMovieItem } from '@/features/profile/api/profileApi';

export type ProfileMoviesSortKey = 'proposedAt' | 'title' | 'year';
export type SortDirection = 'asc' | 'desc';

const DEFAULT_DIRECTION: Record<ProfileMoviesSortKey, SortDirection> = {
  proposedAt: 'desc',
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

function compareItems(a: UserMovieItem, b: UserMovieItem, sortBy: ProfileMoviesSortKey): number {
  switch (sortBy) {
    case 'title':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    case 'year':
      return (Number.parseInt(a.year, 10) || 0) - (Number.parseInt(b.year, 10) || 0);
    case 'proposedAt':
    default:
      return a.proposedAt.localeCompare(b.proposedAt);
  }
}

function itemMatchesSearch(item: UserMovieItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.title.toLowerCase().includes(q);
}

function itemMatchesFilters(item: UserMovieItem, f: FilterState): boolean {
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

interface UseProfileMoviesToolbarOptions {
  items: UserMovieItem[];
  tmdbLanguage: string;
  mediaTypeLabels: Record<MovieMediaType, string>;
}

export function useProfileMoviesToolbar({
  items,
  tmdbLanguage,
  mediaTypeLabels,
}: UseProfileMoviesToolbarOptions) {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<{ by: ProfileMoviesSortKey; dir: SortDirection }>({
    by: 'proposedAt',
    dir: 'desc',
  });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [revealCount, setRevealCount] = useState(INITIAL_REVEAL_COUNT);
  const sortBy = sort.by;
  const sortDir = sort.dir;

  const setSortBy = useCallback((key: ProfileMoviesSortKey) => {
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
    const sorted = [...filtered].sort((a, b) => compareItems(a, b, sortBy));
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [items, filters, search, sortBy, sortDir]);

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
