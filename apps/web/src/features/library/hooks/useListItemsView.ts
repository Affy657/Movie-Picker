import { useCallback, useMemo } from 'react';
import type { MovieListItem } from '@/features/library/api/listsApi';
import { watchlistItemKey } from '@/features/movies/utils/watchlistItemKey';

interface ListTitleRef {
  tmdbId: number;
  mediaType?: string;
}

export function useListItemsView(list: { items: MovieListItem[] } | undefined) {
  const items = useMemo(() => list?.items ?? [], [list?.items]);
  const watchedKeys = useMemo(
    () =>
      new Set(
        items
          .filter((item) => item.isWatched)
          .map((item) => watchlistItemKey(item.tmdbId, item.mediaType))
      ),
    [items]
  );
  const isWatched = useCallback(
    (entry: ListTitleRef) => watchedKeys.has(watchlistItemKey(entry.tmdbId, entry.mediaType)),
    [watchedKeys]
  );
  return { items, watchedCount: watchedKeys.size, isWatched };
}
