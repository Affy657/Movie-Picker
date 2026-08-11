import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { syncLetterboxd } from '@/features/letterboxd/api/letterboxdApi';

export function useLetterboxdAutoSync(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (!user?.letterboxdUsername) return;

    attemptedRef.current = true;

    void syncLetterboxd(false)
      .then((report) => {
        if (report.skipped) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
        if (report.added > 0 || report.removed > 0)
          void queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.list });
      })
      .catch(() => undefined);
  }, [queryClient, user?.letterboxdUsername]);
}
