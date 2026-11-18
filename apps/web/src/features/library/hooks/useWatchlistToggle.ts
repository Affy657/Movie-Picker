import { useMemo, useState } from 'react';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { TitleSummary } from '@/shared/types/movie';
import { toTitleSummary } from '@/shared/utils/titleSummary';
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '@/features/movies/hooks/useWatchlist';
import { watchlistItemKey } from '@/features/movies/utils/watchlistItemKey';

export type WatchlistToggleItem = TitleSummary;

type WatchlistToggleRef = Pick<WatchlistToggleItem, 'tmdbId' | 'mediaType'>;

export function useWatchlistToggle(enabled: boolean) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const watchlistQuery = useWatchlist({ enabled });
  const keys = useMemo(
    () => new Set((watchlistQuery.data ?? []).map((i) => watchlistItemKey(i.tmdbId, i.mediaType))),
    [watchlistQuery.data]
  );
  const { mutate: add } = useAddToWatchlist({
    onError: (err) => setError(getErrorMessage(err, t('watchlist.card.addError'))),
  });
  const { mutate: remove } = useRemoveFromWatchlist({
    onError: (err) => setError(getErrorMessage(err, t('watchlist.card.removeError'))),
  });

  const has = (item: WatchlistToggleRef) => keys.has(watchlistItemKey(item.tmdbId, item.mediaType));

  const toggle = (item: WatchlistToggleItem) => {
    setError(null);
    if (has(item)) {
      remove({ tmdbId: item.tmdbId, mediaType: item.mediaType });
      return;
    }
    add(toTitleSummary(item));
  };

  return { has, error, toggle };
}
