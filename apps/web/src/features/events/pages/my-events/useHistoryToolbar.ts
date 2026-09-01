import { useCallback, useMemo, useState } from 'react';
import type { MyEventSummary } from '@/features/events/types';

export type HistorySortKey = 'date';
export type HistorySortDirection = 'asc' | 'desc';
export type HistoryRole = 'hosted' | 'joined';

interface UseHistoryToolbarOptions {
  events: MyEventSummary[];
}

function matchesRoles(event: MyEventSummary, roles: Set<HistoryRole>): boolean {
  if (roles.size === 0) return true;
  if (roles.has('hosted') && event.isCreator) return true;
  if (roles.has('joined') && !event.isCreator) return true;
  return false;
}

export function useHistoryToolbar({ events }: UseHistoryToolbarOptions) {
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<HistorySortDirection>('desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [roles, setRoles] = useState<Set<HistoryRole>>(new Set());

  const setSortBy = useCallback((_key: HistorySortKey) => {
    setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
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
    return sortDir === 'asc' ? [...filtered].reverse() : filtered;
  }, [events, roles, sortDir]);

  return {
    search,
    setSearch,
    sortBy: 'date' as const,
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
