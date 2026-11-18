import { useMemo } from 'react';
import type { MovieListItem } from '@/features/library/api/listsApi';

function isWatched(item: MovieListItem): boolean {
  return item.isWatched === true;
}

export function useListItemsView(list: { items: MovieListItem[] } | undefined) {
  const items = useMemo(() => list?.items ?? [], [list?.items]);
  const watchedCount = useMemo(() => items.filter(isWatched).length, [items]);
  return { items, watchedCount, isWatched };
}
