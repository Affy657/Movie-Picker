import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { genreLabel, sharesAnyGenre } from '@/shared/utils/tmdbGenres';
import {
  DECADE_OPTIONS,
  RUNTIME_MAX_MINUTES,
  RUNTIME_MIN_MINUTES,
  runtimeChipLabel,
  voteMinLabel,
} from '@/features/movies/components/movieSearchFilterOptions';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';
import { useHistoryEntryState } from '@/shared/hooks/useHistoryEntryState';
import type { RatingScale } from '@/shared/types/theme';
import type { MovieMediaType, WatchProviderOffer } from '@/shared/types/movie';
import type { WatchlistItem } from '@/features/movies/api/watchlistApi';

export interface WatchlistEntry extends WatchlistItem {
  watchProviders?: WatchProviderOffer[];
  tmdbWatchPageUrl?: string | null;
}

export type WatchlistSortKey =
  'relevance' | 'createdAt' | 'title' | 'voteAverage' | 'duration' | 'year' | 'availability';
export type SortDirection = 'asc' | 'desc';

const SORT_KEYS = new Set<WatchlistSortKey>([
  'relevance',
  'createdAt',
  'title',
  'voteAverage',
  'duration',
  'year',
  'availability',
]);

const DEFAULT_DIRECTION: Record<WatchlistSortKey, SortDirection> = {
  relevance: 'asc',
  createdAt: 'desc',
  title: 'asc',
  voteAverage: 'desc',
  duration: 'asc',
  year: 'desc',
  availability: 'desc',
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

export type ToolbarStorageScope = 'watchlist' | 'list' | 'watched' | 'savedList' | 'publicList';

function storageKey(scope: ToolbarStorageScope, userId: string, listId?: string): string {
  const owner = listId ? `${scope}_${listId}` : scope;
  return `moviepicker_${owner}_toolbar_${userId}`;
}

function defaultStateFor(sortBy: WatchlistSortKey): PersistedState {
  return { ...DEFAULT_STATE, sortBy, sortDir: DEFAULT_DIRECTION[sortBy] };
}

function readPersisted(key: string, defaults: PersistedState): PersistedState {
  const raw = safeLocalStorageGet(key);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaults;
    const p = parsed as Partial<Record<keyof PersistedState, unknown>>;
    const runtimeRange =
      Array.isArray(p.runtimeRange) &&
      p.runtimeRange.length === 2 &&
      p.runtimeRange.every((n) => typeof n === 'number')
        ? ([p.runtimeRange[0], p.runtimeRange[1]] as [number, number])
        : DEFAULT_STATE.runtimeRange;
    return {
      sortBy: SORT_KEYS.has(p.sortBy as WatchlistSortKey)
        ? (p.sortBy as WatchlistSortKey)
        : defaults.sortBy,
      sortDir: p.sortDir === 'asc' || p.sortDir === 'desc' ? p.sortDir : defaults.sortDir,
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
    return defaults;
  }
}

function writePersisted(key: string, state: PersistedState) {
  safeLocalStorageSet(key, JSON.stringify(state));
}

function compareItems(
  a: WatchlistEntry,
  b: WatchlistEntry,
  sortBy: WatchlistSortKey,
  positionOf: (item: WatchlistEntry) => number
): number {
  switch (sortBy) {
    case 'relevance':
      return positionOf(a) - positionOf(b);
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
    case 'year':
      return a.year.localeCompare(b.year);
    case 'availability':
      return (a.watchProviders?.length ?? 0) - (b.watchProviders?.length ?? 0);
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

function itemMatchesDecade(item: WatchlistItem, decade: string): boolean {
  const year = Number.parseInt(item.year, 10);
  const from = Number.parseInt(decade, 10);
  return !(Number.isNaN(year) || year < from || year > from + 9);
}

function itemMatchesRuntime(item: WatchlistItem, range: [number, number]): boolean {
  const runtimeMin = range[0] > RUNTIME_MIN_MINUTES ? range[0] : undefined;
  const runtimeMax = range[1] < RUNTIME_MAX_MINUTES ? range[1] : undefined;
  if (runtimeMin != null && (item.runtimeMinutes ?? -Infinity) < runtimeMin) return false;
  if (runtimeMax != null && (item.runtimeMinutes ?? Infinity) > runtimeMax) return false;
  return true;
}

function itemMatchesFilters(item: WatchlistItem, f: PersistedState): boolean {
  if (f.genres.length > 0 && !sharesAnyGenre(item.genreIds ?? [], f.genres)) return false;
  if (f.mediaTypes.length > 0 && !f.mediaTypes.includes(item.mediaType)) return false;
  if (f.decade != null && !itemMatchesDecade(item, f.decade)) return false;
  if (f.voteMin != null && (item.voteAverage ?? -Infinity) < f.voteMin) return false;
  return itemMatchesRuntime(item, f.runtimeRange);
}

export interface ActiveToolbarChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface ToolbarExtraFilter {
  matches: (item: WatchlistEntry) => boolean;
  active: boolean;
  reset: () => void;
}

interface UseWatchlistToolbarOptions {
  items: WatchlistEntry[];
  userId: string | undefined;
  tmdbLanguage: string;
  ratingScale?: RatingScale;
  mediaTypeLabels: Record<MovieMediaType, string>;
  storageScope?: ToolbarStorageScope;
  storageListId?: string;
  extraFilter?: ToolbarExtraFilter;
  defaultSortBy?: WatchlistSortKey;
}

export function useWatchlistToolbar({
  items,
  userId,
  tmdbLanguage,
  ratingScale,
  mediaTypeLabels,
  storageScope = 'watchlist',
  storageListId,
  extraFilter,
  defaultSortBy = 'createdAt',
}: UseWatchlistToolbarOptions) {
  const defaults = useMemo(() => defaultStateFor(defaultSortBy), [defaultSortBy]);
  const [search, setSearch] = useHistoryEntryState('watchlistToolbar.search', '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [state, setState] = useState<PersistedState>(defaults);
  const skipNextWriteRef = useRef(true);
  const persistedKey = userId ? storageKey(storageScope, userId, storageListId) : null;

  useEffect(() => {
    skipNextWriteRef.current = true;
    setState(persistedKey ? readPersisted(persistedKey, defaults) : defaults);
  }, [persistedKey, defaults]);

  useEffect(() => {
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    if (persistedKey) writePersisted(persistedKey, state);
  }, [persistedKey, state]);

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
    extraFilter?.reset();
  }, [setSearch, clearAllFilters, extraFilter]);

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

  const isFiltered = hasActiveFilters || search.trim() !== '' || !!extraFilter?.active;

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
      const label = runtimeChipLabel(
        runtimeMin ?? undefined,
        runtimeMax ?? undefined,
        state.runtimeRange,
        tmdbLanguage
      );
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
      (item) =>
        itemMatchesFilters(item, state) &&
        itemMatchesSearch(item, search) &&
        (extraFilter?.matches(item) ?? true)
    );
    const positions = new Map(items.map((item, index) => [item, index]));
    const positionOf = (item: WatchlistEntry) => positions.get(item) ?? 0;
    const sorted = [...filtered].sort((a, b) => compareItems(a, b, state.sortBy, positionOf));
    return state.sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [items, state, search, extraFilter]);

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
