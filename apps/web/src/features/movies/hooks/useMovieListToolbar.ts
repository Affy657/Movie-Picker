import { useCallback, useMemo, useState } from 'react';
import { useHistoryEntryState } from '@/shared/hooks/useHistoryEntryState';
import { genreLabel, sharesAnyGenre } from '@/shared/utils/tmdbGenres';
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

const DEFAULT_SORT: { by: MovieListSortKey; dir: SortDirection } = { by: 'primary', dir: 'desc' };

const INITIAL_REVEAL = { criteria: '', count: INITIAL_REVEAL_COUNT };

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
  if (f.genres.length > 0 && !sharesAnyGenre(item.genreIds, f.genres)) return false;
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
  const [search, setSearch] = useHistoryEntryState('movieList.search', '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useHistoryEntryState('movieList.sort', DEFAULT_SORT);
  const [filters, setFilters] = useHistoryEntryState('movieList.filters', DEFAULT_FILTERS);
  const [reveal, setReveal] = useHistoryEntryState('movieList.reveal', INITIAL_REVEAL);
  const sortBy = sort.by;
  const sortDir = sort.dir;

  const setSortBy = useCallback(
    (key: MovieListSortKey) => {
      setSort((prev) =>
        prev.by === key
          ? { by: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
          : { by: key, dir: DEFAULT_DIRECTION[key] }
      );
    },
    [setSort]
  );

  const toggleGenre = useCallback(
    (id: number) => {
      setFilters((prev) => ({
        ...prev,
        genres: prev.genres.includes(id)
          ? prev.genres.filter((g) => g !== id)
          : [...prev.genres, id],
      }));
    },
    [setFilters]
  );

  const removeGenre = useCallback(
    (id: number) => {
      setFilters((prev) => ({ ...prev, genres: prev.genres.filter((g) => g !== id) }));
    },
    [setFilters]
  );

  const toggleMediaType = useCallback(
    (mediaType: MovieMediaType) => {
      setFilters((prev) => ({
        ...prev,
        mediaTypes: prev.mediaTypes.includes(mediaType)
          ? prev.mediaTypes.filter((m) => m !== mediaType)
          : [...prev.mediaTypes, mediaType],
      }));
    },
    [setFilters]
  );

  const toggleDecade = useCallback(
    (decade: string) => {
      setFilters((prev) => ({ ...prev, decade: prev.decade === decade ? undefined : decade }));
    },
    [setFilters]
  );

  const clearAllFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters]);

  const resetAll = useCallback(() => {
    setSearch('');
    clearAllFilters();
  }, [setSearch, clearAllFilters]);

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
  }, [filters, tmdbLanguage, mediaTypeLabels, removeGenre, toggleMediaType, setFilters]);

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

  const revealCriteria = JSON.stringify([search, filters, sortBy, sortDir]);
  const revealCount = reveal.criteria === revealCriteria ? reveal.count : INITIAL_REVEAL_COUNT;

  const revealedItems = useMemo(
    () => visibleItems.slice(0, revealCount),
    [visibleItems, revealCount]
  );

  const remainingCount = Math.max(0, visibleItems.length - revealedItems.length);

  const revealMore = useCallback(() => {
    setReveal({ criteria: revealCriteria, count: revealCount + visibleItems.length });
  }, [setReveal, revealCriteria, revealCount, visibleItems.length]);

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
