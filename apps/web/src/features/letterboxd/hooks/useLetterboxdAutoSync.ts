import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { invalidateWatchlist } from '@/features/movies/hooks/useWatchlist';
import { syncLetterboxd } from '@/features/letterboxd/api/letterboxdApi';

export function useLetterboxdAutoSync(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
        if (report.added > 0 || report.removed > 0) void invalidateWatchlist(queryClient);
        if (report.pendingChoices.length > 0)
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
      })
      .catch(() => undefined);
  }, [queryClient, userId, letterboxdUsername]);
}
