import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { genreLabel, sharesAnyGenre } from '@/shared/utils/tmdbGenres';
import {
  DECADE_OPTIONS,
  RUNTIME_MAX_MINUTES,
  RUNTIME_MIN_MINUTES,
  runtimeChipLabel,
  voteMinLabel,
} from '@/features/movies/components/movieSearchFilterOptions';
import {
  readHistoryEntryValue,
  useHistoryEntryState,
  writeHistoryEntryValue,
} from '@/shared/hooks/useHistoryEntryState';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';
import type { RatingScale } from '@/shared/types/theme';
import type { MovieMediaType, TitleSummary } from '@/shared/types/movie';

export type SortDirection = 'asc' | 'desc';

export type ToolbarItem = Pick<
  TitleSummary,
  'title' | 'year' | 'mediaType' | 'genreIds' | 'voteAverage' | 'runtimeMinutes'
>;

export interface SortRule<T> {
  compare: (a: T, b: T) => number;
  direction: SortDirection;
}

export interface ToolbarSorts<T, K extends string> {
  rules: Readonly<Record<K, SortRule<T>>>;
  defaultKey: K;
}

export type ToolbarFilter = 'genre' | 'mediaType' | 'decade' | 'voteMin' | 'runtime';

export const CATALOG_FILTERS: readonly ToolbarFilter[] = ['genre', 'mediaType', 'decade'];

export const LIBRARY_FILTERS: readonly ToolbarFilter[] = [...CATALOG_FILTERS, 'voteMin', 'runtime'];

export type ToolbarPersistence =
  | { kind: 'historyEntry'; name: string }
  | { kind: 'localStorage'; name: string; key: string | null };

export interface ToolbarExtraFilter<T> {
  matches: (item: T) => boolean;
  active: boolean;
  reset: () => void;
}

export interface ActiveToolbarChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ToolbarView<K extends string> {
  sortBy: K;
  sortDir: SortDirection;
  genres: number[];
  mediaTypes: MovieMediaType[];
  decade?: string;
  voteMin?: number;
  runtimeRange: [number, number];
}

const FULL_RUNTIME_RANGE: [number, number] = [RUNTIME_MIN_MINUTES, RUNTIME_MAX_MINUTES];

const NO_FILTERS = {
  genres: [],
  mediaTypes: [],
  decade: undefined,
  voteMin: undefined,
  runtimeRange: FULL_RUNTIME_RANGE,
} satisfies Omit<ToolbarView<string>, 'sortBy' | 'sortDir'>;

export function compareTitles(a: { title: string }, b: { title: string }): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

function isRuntimeRange(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) && value.length === 2 && value.every((bound) => typeof bound === 'number')
  );
}

function parseView<K extends string>(
  raw: unknown,
  defaults: ToolbarView<K>,
  rules: Readonly<Record<K, unknown>>
): ToolbarView<K> {
  if (typeof raw !== 'object' || raw === null) return defaults;
  const stored = raw as Partial<Record<keyof ToolbarView<K>, unknown>>;
  const sortBy =
    typeof stored.sortBy === 'string' && Object.hasOwn(rules, stored.sortBy)
      ? (stored.sortBy as K)
      : defaults.sortBy;
  return {
    sortBy,
    sortDir:
      stored.sortDir === 'asc' || stored.sortDir === 'desc' ? stored.sortDir : defaults.sortDir,
    genres: Array.isArray(stored.genres)
      ? stored.genres.filter((genre): genre is number => typeof genre === 'number')
      : [],
    mediaTypes: Array.isArray(stored.mediaTypes)
      ? stored.mediaTypes.filter((m): m is MovieMediaType => m === 'movie' || m === 'tv')
      : [],
    decade: typeof stored.decade === 'string' ? stored.decade : undefined,
    voteMin: typeof stored.voteMin === 'number' ? stored.voteMin : undefined,
    runtimeRange: isRuntimeRange(stored.runtimeRange)
      ? [stored.runtimeRange[0], stored.runtimeRange[1]]
      : FULL_RUNTIME_RANGE,
  };
}

interface ViewStore {
  slot: string;
  read: () => unknown;
  write: (view: unknown) => void;
}

function historyViewStore(name: string, entryKey: string): ViewStore {
  const field = `${name}.view`;
  return {
    slot: field,
    read: () => readHistoryEntryValue(entryKey, field),
    write: (view) => writeHistoryEntryValue(entryKey, field, view),
  };
}

function localViewStore(key: string | null): ViewStore {
  return {
    slot: key ?? '',
    read: () => {
      const raw = key ? safeLocalStorageGet(key) : null;
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return undefined;
      }
    },
    write: (view) => {
      if (key) safeLocalStorageSet(key, JSON.stringify(view));
    },
  };
}

function useToolbarView<K extends string>(
  persistence: ToolbarPersistence,
  defaults: ToolbarView<K>,
  rules: Readonly<Record<K, unknown>>
) {
  const { key: entryKey } = useLocation();
  const { kind, name } = persistence;
  const localKey = persistence.kind === 'localStorage' ? persistence.key : null;
  const store = useMemo(
    () => (kind === 'historyEntry' ? historyViewStore(name, entryKey) : localViewStore(localKey)),
    [kind, name, entryKey, localKey]
  );
  const [view, setView] = useState(() => parseView(store.read(), defaults, rules));
  const loaded = useRef({ slot: store.slot, defaults });
  const skipNextWrite = useRef(true);

  useEffect(() => {
    if (loaded.current.slot === store.slot && loaded.current.defaults === defaults) return;
    loaded.current = { slot: store.slot, defaults };
    skipNextWrite.current = true;
    setView(parseView(store.read(), defaults, rules));
  }, [store, defaults, rules]);

  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    store.write(view);
  }, [store, view]);

  return [view, setView] as const;
}

function itemMatchesSearch(item: ToolbarItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.title.toLowerCase().includes(q);
}

function itemMatchesDecade(item: ToolbarItem, decade: string): boolean {
  const year = Number.parseInt(item.year, 10);
  const from = Number.parseInt(decade, 10);
  return !(Number.isNaN(year) || year < from || year > from + 9);
}

function runtimeBounds(range: [number, number]) {
  return {
    min: range[0] > RUNTIME_MIN_MINUTES ? range[0] : undefined,
    max: range[1] < RUNTIME_MAX_MINUTES ? range[1] : undefined,
  };
}

function itemMatchesRuntime(item: ToolbarItem, range: [number, number]): boolean {
  const { min, max } = runtimeBounds(range);
  if (min != null && (item.runtimeMinutes ?? -Infinity) < min) return false;
  if (max != null && (item.runtimeMinutes ?? Infinity) > max) return false;
  return true;
}

function itemMatchesFilters(item: ToolbarItem, view: ToolbarView<string>): boolean {
  if (view.genres.length > 0 && !sharesAnyGenre(item.genreIds ?? [], view.genres)) return false;
  if (view.mediaTypes.length > 0 && !view.mediaTypes.includes(item.mediaType)) return false;
  if (view.decade != null && !itemMatchesDecade(item, view.decade)) return false;
  if (view.voteMin != null && (item.voteAverage ?? -Infinity) < view.voteMin) return false;
  return itemMatchesRuntime(item, view.runtimeRange);
}

function hasFilters(view: ToolbarView<string>): boolean {
  const runtime = runtimeBounds(view.runtimeRange);
  return (
    view.genres.length > 0 ||
    view.mediaTypes.length > 0 ||
    view.decade != null ||
    view.voteMin != null ||
    runtime.min != null ||
    runtime.max != null
  );
}

interface UseCollectionToolbarOptions<T extends ToolbarItem, K extends string> {
  items: T[];
  sorts: ToolbarSorts<NoInfer<T>, K>;
  filters: readonly ToolbarFilter[];
  persistence: ToolbarPersistence;
  tmdbLanguage: string;
  ratingScale?: RatingScale;
  mediaTypeLabels: Record<MovieMediaType, string>;
  extraFilter?: ToolbarExtraFilter<NoInfer<T>>;
}

export function useCollectionToolbar<T extends ToolbarItem, K extends string>({
  items,
  sorts,
  filters,
  persistence,
  tmdbLanguage,
  ratingScale,
  mediaTypeLabels,
  extraFilter,
}: UseCollectionToolbarOptions<T, K>) {
  const { rules, defaultKey } = sorts;
  const defaultDir = rules[defaultKey].direction;
  const defaults = useMemo<ToolbarView<K>>(
    () => ({ ...NO_FILTERS, sortBy: defaultKey, sortDir: defaultDir }),
    [defaultKey, defaultDir]
  );
  const [search, setSearch] = useHistoryEntryState(`${persistence.name}.search`, '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useToolbarView(persistence, defaults, rules);

  const setSortBy = useCallback(
    (key: K) => {
      setView((prev) =>
        prev.sortBy === key
          ? { ...prev, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }
          : { ...prev, sortBy: key, sortDir: rules[key].direction }
      );
    },
    [setView, rules]
  );

  const toggleGenre = useCallback(
    (id: number) => {
      setView((prev) => ({
        ...prev,
        genres: prev.genres.includes(id)
          ? prev.genres.filter((g) => g !== id)
          : [...prev.genres, id],
      }));
    },
    [setView]
  );

  const toggleMediaType = useCallback(
    (mediaType: MovieMediaType) => {
      setView((prev) => ({
        ...prev,
        mediaTypes: prev.mediaTypes.includes(mediaType)
          ? prev.mediaTypes.filter((m) => m !== mediaType)
          : [...prev.mediaTypes, mediaType],
      }));
    },
    [setView]
  );

  const toggleDecade = useCallback(
    (decade: string) => {
      setView((prev) => ({ ...prev, decade: prev.decade === decade ? undefined : decade }));
    },
    [setView]
  );

  const toggleVoteMin = useCallback(
    (min: number) => {
      setView((prev) => ({ ...prev, voteMin: prev.voteMin === min ? undefined : min }));
    },
    [setView]
  );

  const changeRuntimeRange = useCallback(
    (min: number, max: number) => {
      setView((prev) => ({ ...prev, runtimeRange: [min, max] }));
    },
    [setView]
  );

  const clearAllFilters = useCallback(() => {
    setView((prev) => ({ ...prev, ...NO_FILTERS }));
  }, [setView]);

  const resetAll = useCallback(() => {
    setSearch('');
    clearAllFilters();
    extraFilter?.reset();
  }, [setSearch, clearAllFilters, extraFilter]);

  const hasActiveFilters = useMemo(() => hasFilters(view), [view]);

  const isFiltered = hasActiveFilters || search.trim() !== '' || !!extraFilter?.active;

  const activeFilterChips = useMemo<ActiveToolbarChip[]>(() => {
    const chips: ActiveToolbarChip[] = [];
    for (const id of view.genres) {
      chips.push({
        key: `g-${id}`,
        label: genreLabel(id, tmdbLanguage),
        onRemove: () =>
          setView((prev) => ({ ...prev, genres: prev.genres.filter((g) => g !== id) })),
      });
    }
    for (const mediaType of view.mediaTypes) {
      chips.push({
        key: `t-${mediaType}`,
        label: mediaTypeLabels[mediaType],
        onRemove: () => toggleMediaType(mediaType),
      });
    }
    if (view.decade != null) {
      chips.push({
        key: 'decade',
        label: `${view.decade}s`,
        onRemove: () => setView((prev) => ({ ...prev, decade: undefined })),
      });
    }
    if (view.voteMin != null) {
      chips.push({
        key: 'vote',
        label: `★ ${voteMinLabel(view.voteMin, ratingScale)}+`,
        onRemove: () => setView((prev) => ({ ...prev, voteMin: undefined })),
      });
    }
    const runtime = runtimeBounds(view.runtimeRange);
    if (runtime.min != null || runtime.max != null) {
      chips.push({
        key: 'runtime',
        label: runtimeChipLabel(runtime.min, runtime.max, view.runtimeRange, tmdbLanguage),
        onRemove: () => setView((prev) => ({ ...prev, runtimeRange: FULL_RUNTIME_RANGE })),
      });
    }
    return chips;
  }, [view, tmdbLanguage, ratingScale, mediaTypeLabels, setView, toggleMediaType]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter(
      (item) =>
        itemMatchesFilters(item, view) &&
        itemMatchesSearch(item, search) &&
        (extraFilter?.matches(item) ?? true)
    );
    const sorted = [...filtered].sort(rules[view.sortBy].compare);
    return view.sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [items, view, search, extraFilter, rules]);

  const withVoteMin = filters.includes('voteMin');
  const withRuntime = filters.includes('runtime');

  return {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    sortBy: view.sortBy,
    sortDir: view.sortDir,
    setSortBy,
    selectedGenres: view.genres,
    toggleGenre,
    selectedMediaTypes: view.mediaTypes,
    toggleMediaType,
    selectedDecade: view.decade,
    toggleDecade,
    voteMin: withVoteMin ? view.voteMin : undefined,
    toggleVoteMin: withVoteMin ? toggleVoteMin : undefined,
    runtimeRange: withRuntime ? view.runtimeRange : undefined,
    changeRuntimeRange: withRuntime ? changeRuntimeRange : undefined,
    clearAllFilters,
    resetAll,
    hasActiveFilters,
    isFiltered,
    activeFilterChips,
    visibleItems,
    visibleCount: visibleItems.length,
    totalCount: items.length,
    decadeOptions: DECADE_OPTIONS,
  };
}

const INITIAL_REVEAL_COUNT = 24;

const INITIAL_REVEAL = { criteria: '', count: INITIAL_REVEAL_COUNT };

export function useProgressiveReveal<T>(items: T[], criteria: unknown, historyName: string) {
  const [reveal, setReveal] = useHistoryEntryState(`${historyName}.reveal`, INITIAL_REVEAL);
  const revealCriteria = JSON.stringify(criteria);
  const revealCount = reveal.criteria === revealCriteria ? reveal.count : INITIAL_REVEAL_COUNT;

  const revealedItems = useMemo(() => items.slice(0, revealCount), [items, revealCount]);

  const revealMore = useCallback(() => {
    setReveal({ criteria: revealCriteria, count: revealCount + items.length });
  }, [setReveal, revealCriteria, revealCount, items.length]);

  return {
    revealedItems,
    remainingCount: Math.max(0, items.length - revealedItems.length),
    revealMore,
  };
}
