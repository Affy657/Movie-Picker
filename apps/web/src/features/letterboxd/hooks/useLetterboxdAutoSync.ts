import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { invalidateWatchlist } from '@/features/movies/hooks/useWatchlist';
import { invalidateWatched } from '@/features/movies/hooks/invalidateWatched';
import { syncLetterboxd } from '@/features/letterboxd/api/letterboxdApi';
import {
  listChanged,
  pendingChoicesOf,
  syncMeasureOf,
} from '@/features/letterboxd/utils/syncReport';
import { useAnalytics } from '@/shared/hooks/useAnalytics';

export function useLetterboxdAutoSync(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { track } = useAnalytics();
  const decidedForUserIdRef = useRef<string | null>(null);
  const userId = user?.userId ?? null;
  const letterboxdUsername = user?.letterboxdUsername ?? null;

  useEffect(() => {
    if (userId === null) {
      decidedForUserIdRef.current = null;
      return;
    }
    if (decidedForUserIdRef.current === userId) return;
    decidedForUserIdRef.current = userId;
    if (!letterboxdUsername) return;

    void syncLetterboxd(false)
      .then((report) => {
        if (report.skipped) return;
        track('letterboxd_synced', { mode: 'auto', ...syncMeasureOf(report) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
        if (listChanged(report, 'watched')) void invalidateWatched(queryClient);
        else if (listChanged(report, 'watchlist')) void invalidateWatchlist(queryClient);
        if (pendingChoicesOf(report).length > 0)
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
      })
      .catch(() => undefined);
  }, [queryClient, userId, letterboxdUsername, track]);
}
