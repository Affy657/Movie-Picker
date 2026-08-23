import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import {
  DECADE_OPTIONS,
  RUNTIME_MAX_MINUTES,
  RUNTIME_MIN_MINUTES,
  runtimeRangeLabel,
  voteMinLabel,
} from '@/features/movies/components/movieSearchFilterOptions';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';
import type { RatingScale } from '@/shared/types/theme';
import type { MovieMediaType } from '@/shared/types/movie';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';

export type WatchlistSortKey = 'createdAt' | 'title' | 'voteAverage' | 'duration';
export type SortDirection = 'asc' | 'desc';

const SORT_KEYS: WatchlistSortKey[] = ['createdAt', 'title', 'voteAverage', 'duration'];

const DEFAULT_DIRECTION: Record<WatchlistSortKey, SortDirection> = {
  createdAt: 'desc',
  title: 'asc',
  voteAverage: 'desc',
  duration: 'asc',
};

interface PersistedState {
  sortBy: WatchlistSortKey;
  sortDir: SortDirection;
  genres: number[];
  mediaTypes: MovieMediaType[];
  decade?: string;
  voteMin?: number;
  runtimeRange: [number, number];
}

const DEFAULT_STATE: PersistedState = {
  sortBy: 'createdAt',
  sortDir: 'desc',
  genres: [],
  mediaTypes: [],
  decade: undefined,
  voteMin: undefined,
  runtimeRange: [RUNTIME_MIN_MINUTES, RUNTIME_MAX_MINUTES],
};

function storageKey(userId: string): string {
  return `moviepicker_watchlist_toolbar_${userId}`;
}

function readPersisted(userId: string): PersistedState {
  const raw = safeLocalStorageGet(storageKey(userId));
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_STATE;
    const p = parsed as Partial<Record<keyof PersistedState, unknown>>;
    const runtimeRange =
      Array.isArray(p.runtimeRange) &&
      p.runtimeRange.length === 2 &&
      p.runtimeRange.every((n) => typeof n === 'number')
        ? ([p.runtimeRange[0], p.runtimeRange[1]] as [number, number])
        : DEFAULT_STATE.runtimeRange;
    return {
      sortBy: SORT_KEYS.includes(p.sortBy as WatchlistSortKey)
        ? (p.sortBy as WatchlistSortKey)
        : DEFAULT_STATE.sortBy,
      sortDir: p.sortDir === 'asc' || p.sortDir === 'desc' ? p.sortDir : DEFAULT_STATE.sortDir,
      genres: Array.isArray(p.genres)
        ? p.genres.filter((g) => typeof g === 'number')
        : DEFAULT_STATE.genres,
      mediaTypes: Array.isArray(p.mediaTypes)
        ? p.mediaTypes.filter((m): m is MovieMediaType => m === 'movie' || m === 'tv')
        : DEFAULT_STATE.mediaTypes,
      decade: typeof p.decade === 'string' ? p.decade : undefined,
      voteMin: typeof p.voteMin === 'number' ? p.voteMin : undefined,
      runtimeRange,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writePersisted(userId: string, state: PersistedState) {
  safeLocalStorageSet(storageKey(userId), JSON.stringify(state));
}

function compareItems(a: WatchlistItem, b: WatchlistItem, sortBy: WatchlistSortKey): number {
  switch (sortBy) {
    case 'title':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    case 'voteAverage': {
      const va = a.voteAverage ?? -Infinity;
      const vb = b.voteAverage ?? -Infinity;
      return va - vb;
    }
    case 'duration': {
      const ra = a.runtimeMinutes ?? Infinity;
      const rb = b.runtimeMinutes ?? Infinity;
      return ra - rb;
    }
    case 'createdAt':
    default:
      return a.createdAt.localeCompare(b.createdAt);
  }
}

function itemMatchesSearch(item: WatchlistItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.title.toLowerCase().includes(q);
}

function itemMatchesFilters(item: WatchlistItem, f: PersistedState): boolean {
  if (f.genres.length > 0) {
    const itemGenres = item.genreIds ?? [];
    if (!itemGenres.some((g) => f.genres.includes(g))) return false;
  }
  if (f.mediaTypes.length > 0 && !f.mediaTypes.includes(item.mediaType)) return false;
  if (f.decade != null) {
    const year = Number.parseInt(item.year, 10);
    const from = Number.parseInt(f.decade, 10);
    if (Number.isNaN(year) || year < from || year > from + 9) return false;
  }
  if (f.voteMin != null && (item.voteAverage ?? -Infinity) < f.voteMin) return false;
  const runtimeMin = f.runtimeRange[0] > RUNTIME_MIN_MINUTES ? f.runtimeRange[0] : undefined;
  const runtimeMax = f.runtimeRange[1] < RUNTIME_MAX_MINUTES ? f.runtimeRange[1] : undefined;
  if (runtimeMin != null && (item.runtimeMinutes ?? -Infinity) < runtimeMin) return false;
  if (runtimeMax != null && (item.runtimeMinutes ?? Infinity) > runtimeMax) return false;
  return true;
}

export interface ActiveToolbarChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface UseWatchlistToolbarOptions {
  items: WatchlistItem[];
  userId: string | undefined;
  tmdbLanguage: string;
  ratingScale?: RatingScale;
  mediaTypeLabels: Record<MovieMediaType, string>;
}

export function useWatchlistToolbar({
  items,
  userId,
  tmdbLanguage,
  ratingScale,
  mediaTypeLabels,
}: UseWatchlistToolbarOptions) {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const skipNextWriteRef = useRef(true);

  useEffect(() => {
    skipNextWriteRef.current = true;
    setState(userId ? readPersisted(userId) : DEFAULT_STATE);
  }, [userId]);

  useEffect(() => {
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    if (userId) writePersisted(userId, state);
  }, [userId, state]);

  const setSortBy = useCallback((key: WatchlistSortKey) => {
    setState((prev) =>
      prev.sortBy === key
        ? { ...prev, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }
        : { ...prev, sortBy: key, sortDir: DEFAULT_DIRECTION[key] }
    );
  }, []);

  const toggleGenre = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      genres: prev.genres.includes(id) ? prev.genres.filter((g) => g !== id) : [...prev.genres, id],
    }));
  }, []);

  const removeGenre = useCallback((id: number) => {
    setState((prev) => ({ ...prev, genres: prev.genres.filter((g) => g !== id) }));
  }, []);

  const toggleMediaType = useCallback((mediaType: MovieMediaType) => {
    setState((prev) => ({
      ...prev,
      mediaTypes: prev.mediaTypes.includes(mediaType)
        ? prev.mediaTypes.filter((m) => m !== mediaType)
        : [...prev.mediaTypes, mediaType],
    }));
  }, []);

  const toggleDecade = useCallback((decade: string) => {
    setState((prev) => ({ ...prev, decade: prev.decade === decade ? undefined : decade }));
  }, []);

  const toggleVoteMin = useCallback((min: number) => {
    setState((prev) => ({ ...prev, voteMin: prev.voteMin === min ? undefined : min }));
  }, []);

  const changeRuntimeRange = useCallback((min: number, max: number) => {
    setState((prev) => ({ ...prev, runtimeRange: [min, max] }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      genres: [],
      mediaTypes: [],
      decade: undefined,
      voteMin: undefined,
      runtimeRange: [RUNTIME_MIN_MINUTES, RUNTIME_MAX_MINUTES],
    }));
  }, []);

  const resetAll = useCallback(() => {
    setSearch('');
    clearAllFilters();
  }, [clearAllFilters]);

  const hasActiveFilters = useMemo(
    () =>
      state.genres.length > 0 ||
      state.mediaTypes.length > 0 ||
      state.decade != null ||
      state.voteMin != null ||
      state.runtimeRange[0] > RUNTIME_MIN_MINUTES ||
      state.runtimeRange[1] < RUNTIME_MAX_MINUTES,
    [state]
  );

  const isFiltered = hasActiveFilters || search.trim() !== '';

  const activeFilterChips = useMemo<ActiveToolbarChip[]>(() => {
    const chips: ActiveToolbarChip[] = [];
    for (const id of state.genres) {
      chips.push({
        key: `g-${id}`,
        label: genreLabel(id, tmdbLanguage),
        onRemove: () => removeGenre(id),
      });
    }
    for (const mediaType of state.mediaTypes) {
      chips.push({
        key: `t-${mediaType}`,
        label: mediaTypeLabels[mediaType],
        onRemove: () => toggleMediaType(mediaType),
      });
    }
    if (state.decade != null) {
      chips.push({
        key: 'decade',
        label: `${state.decade}s`,
        onRemove: () => setState((prev) => ({ ...prev, decade: undefined })),
      });
    }
    if (state.voteMin != null) {
      chips.push({
        key: 'vote',
        label: `★ ${voteMinLabel(state.voteMin, ratingScale)}+`,
        onRemove: () => setState((prev) => ({ ...prev, voteMin: undefined })),
      });
    }
    const runtimeMin =
      state.runtimeRange[0] > RUNTIME_MIN_MINUTES ? state.runtimeRange[0] : undefined;
    const runtimeMax =
      state.runtimeRange[1] < RUNTIME_MAX_MINUTES ? state.runtimeRange[1] : undefined;
    if (runtimeMin != null || runtimeMax != null) {
      const label =
        runtimeMin != null && runtimeMax != null
          ? `${runtimeRangeLabel(state.runtimeRange[0], tmdbLanguage)} - ${runtimeRangeLabel(state.runtimeRange[1], tmdbLanguage)}`
          : runtimeMin != null
            ? runtimeRangeLabel(state.runtimeRange[0], tmdbLanguage, 'min')
            : runtimeRangeLabel(state.runtimeRange[1], tmdbLanguage, 'max');
      chips.push({
        key: 'runtime',
        label,
        onRemove: () =>
          setState((prev) => ({
            ...prev,
            runtimeRange: [RUNTIME_MIN_MINUTES, RUNTIME_MAX_MINUTES],
          })),
      });
    }
    return chips;
  }, [state, tmdbLanguage, ratingScale, mediaTypeLabels, removeGenre, toggleMediaType]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter(
      (item) => itemMatchesFilters(item, state) && itemMatchesSearch(item, search)
    );
    const sorted = [...filtered].sort((a, b) => compareItems(a, b, state.sortBy));
    return state.sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [items, state, search]);

  return {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    sortBy: state.sortBy,
    sortDir: state.sortDir,
    setSortBy,
    selectedGenres: state.genres,
    toggleGenre,
    selectedMediaTypes: state.mediaTypes,
    toggleMediaType,
    selectedDecade: state.decade,
    toggleDecade,
    clearAllFilters,
    resetAll,
    voteMin: state.voteMin,
    toggleVoteMin,
    runtimeRange: state.runtimeRange,
    changeRuntimeRange,
    hasActiveFilters,
    isFiltered,
    activeFilterChips,
    visibleItems,
    visibleCount: visibleItems.length,
    totalCount: items.length,
    decadeOptions: DECADE_OPTIONS,
  };
}
