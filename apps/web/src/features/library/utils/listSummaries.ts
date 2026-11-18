import { normalizeListName } from './listName';
import { compareListProgress } from './listProgress';

export type ListSortKey = 'recent' | 'name' | 'size' | 'progress';

export type ListSortDirection = 'asc' | 'desc';

export const DEFAULT_LIST_SORT_DIRECTION: Record<ListSortKey, ListSortDirection> = {
  recent: 'desc',
  name: 'asc',
  size: 'desc',
  progress: 'desc',
};

interface SortableList {
  name: string;
  itemCount: number;
  watchedCount?: number | null;
  updatedAt: string;
}

function compareLists(a: SortableList, b: SortableList, sortBy: ListSortKey): number {
  if (sortBy === 'name') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (sortBy === 'size') return a.itemCount - b.itemCount;
  if (sortBy === 'progress') return compareListProgress(a, b);
  return a.updatedAt.localeCompare(b.updatedAt);
}

export function sortListSummaries<T extends SortableList>(
  items: readonly T[],
  sortBy: ListSortKey,
  sortDir: ListSortDirection
): T[] {
  const direction = sortDir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => compareLists(a, b, sortBy) * direction);
}

export function matchesListSearch(name: string, search: string): boolean {
  const query = normalizeListName(search);
  return !query || normalizeListName(name).includes(query);
}
