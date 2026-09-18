import { useCallback, useMemo } from 'react';
import { getErrorMessage } from '@/shared/api/apiError';
import type { MovieData } from '@/shared/types/movie';
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '@/features/movies/hooks/useWatchlist';
import { useTranslation } from '@/shared/i18n';

function watchlistKey(tmdbId: number, mediaType: MovieData['mediaType']): string {
  return `${tmdbId}|${mediaType ?? 'movie'}`;
}

export function useEventWatchlistToggle(
  enabled: boolean,
  setActionError: (message: string | null) => void
) {
  const { t } = useTranslation();
  const watchlistQuery = useWatchlist({ enabled });
  const watchlistKeys = useMemo(
    () => new Set((watchlistQuery.data ?? []).map((i) => watchlistKey(i.tmdbId, i.mediaType))),
    [watchlistQuery.data]
  );

  const { mutate: addToWatchlist } = useAddToWatchlist({
    onError: (e) => setActionError(getErrorMessage(e, t('watchlist.card.addError'))),
  });
  const { mutate: removeFromWatchlist } = useRemoveFromWatchlist({
    onError: (e) => setActionError(getErrorMessage(e, t('watchlist.card.removeError'))),
  });

  const isInWatchlist = useCallback(
    (m: MovieData) => watchlistKeys.has(watchlistKey(m.tmdbId, m.mediaType)),
    [watchlistKeys]
  );

  const toggleWatchlist = useCallback(
    (m: MovieData) => {
      setActionError(null);
      if (watchlistKeys.has(watchlistKey(m.tmdbId, m.mediaType))) {
        removeFromWatchlist({ tmdbId: m.tmdbId, mediaType: m.mediaType });
        return;
      }
      addToWatchlist({
        tmdbId: m.tmdbId,
        mediaType: m.mediaType,
        title: m.title,
        year: m.year,
        posterPath: m.posterPath,
        voteAverage: m.voteAverage,
        runtimeMinutes: m.runtimeMinutes,
      });
    },
    [watchlistKeys, addToWatchlist, removeFromWatchlist, setActionError]
  );

  return { isInWatchlist, toggleWatchlist };
}
