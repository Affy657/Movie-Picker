import { useMemo, useState } from 'react';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { MovieMediaType } from '@/shared/types/movie';
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from './useWatchlist';

export interface WatchlistToggleItem {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
}

type WatchlistToggleRef = Pick<WatchlistToggleItem, 'tmdbId' | 'mediaType'>;

export function watchlistKey(tmdbId: number, mediaType: string): string {
  return `${tmdbId}|${mediaType}`;
}

export function useWatchlistToggle(enabled: boolean) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const watchlistQuery = useWatchlist({ enabled });
  const keys = useMemo(
    () => new Set((watchlistQuery.data ?? []).map((i) => watchlistKey(i.tmdbId, i.mediaType))),
    [watchlistQuery.data]
  );
  const { mutate: add } = useAddToWatchlist({
    onError: (err) => setError(getErrorMessage(err, t('watchlist.card.addError'))),
  });
  const { mutate: remove } = useRemoveFromWatchlist({
    onError: (err) => setError(getErrorMessage(err, t('watchlist.card.removeError'))),
  });

  const has = (item: WatchlistToggleRef) => keys.has(watchlistKey(item.tmdbId, item.mediaType));

  const toggle = (item: WatchlistToggleItem) => {
    setError(null);
    if (has(item)) {
      remove({ tmdbId: item.tmdbId, mediaType: item.mediaType });
      return;
    }
    add({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      year: item.year,
      posterPath: item.posterPath,
    });
  };

  return { has, error, toggle };
}
