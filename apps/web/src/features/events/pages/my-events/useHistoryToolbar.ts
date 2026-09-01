import { useCallback, useMemo, useState } from 'react';
import type { MyEventSummary } from '@/features/events/types';

export type HistorySortKey = 'date' | 'title' | 'movieCount';
export type HistorySortDirection = 'asc' | 'desc';
export type HistoryRole = 'hosted' | 'joined';

interface UseHistoryToolbarOptions {
  events: MyEventSummary[];
}

const DEFAULT_DIRECTION: Record<HistorySortKey, HistorySortDirection> = {
  date: 'desc',
  title: 'asc',
  movieCount: 'desc',
};

function matchesRoles(event: MyEventSummary, roles: Set<HistoryRole>): boolean {
  if (roles.size === 0) return true;
  if (roles.has('hosted') && event.isCreator) return true;
  if (roles.has('joined') && !event.isCreator) return true;
  return false;
}

function compareEvents(a: MyEventSummary, b: MyEventSummary, sortBy: HistorySortKey): number {
  switch (sortBy) {
    case 'title':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    case 'movieCount':
      return (a.movieCount ?? 0) - (b.movieCount ?? 0);
    case 'date':
    default:
      return a.date.localeCompare(b.date);
  }
}

interface SortState {
  sortBy: HistorySortKey;
  sortDir: HistorySortDirection;
}

export function useHistoryToolbar({ events }: UseHistoryToolbarOptions) {
  const [search, setSearch] = useState('');
  const [{ sortBy, sortDir }, setSort] = useState<SortState>({ sortBy: 'date', sortDir: 'desc' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [roles, setRoles] = useState<Set<HistoryRole>>(new Set());

  const setSortBy = useCallback((key: HistorySortKey) => {
    setSort((prev) => ({
      sortBy: key,
      sortDir:
        prev.sortBy === key ? (prev.sortDir === 'asc' ? 'desc' : 'asc') : DEFAULT_DIRECTION[key],
    }));
  }, []);

  const toggleRole = useCallback((role: HistoryRole) => {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => setRoles(new Set()), []);

  const resetAll = useCallback(() => {
    setSearch('');
    clearAllFilters();
  }, [clearAllFilters]);

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((e) => matchesRoles(e, roles));
    const sorted = [...filtered].sort((a, b) => compareEvents(a, b, sortBy));
    return sortDir === 'asc' ? sorted : sorted.reverse();
  }, [events, roles, sortBy, sortDir]);

  return {
    search,
    setSearch,
    sortBy,
    sortDir,
    setSortBy,
    filtersOpen,
    setFiltersOpen,
    roles,
    toggleRole,
    activeFilterCount: roles.size,
    isFiltered: roles.size > 0,
    clearAllFilters,
    resetAll,
    visibleEvents,
  };
}
