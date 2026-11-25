import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useOptimisticProfilePatch } from '@/features/auth/hooks/useOptimisticProfilePatch';
import type { ProfilePatch } from '@/features/auth/api/authApi';
import type { LetterboxdList } from '@/features/letterboxd/api/letterboxdApi';
import { letterboxdSyncEnabled } from '@/features/letterboxd/utils/letterboxdSync';

function patchFor(target: LetterboxdList, enabled: boolean): ProfilePatch {
  return target === 'watchlist'
    ? { letterboxdSyncWatchlist: enabled }
    : { letterboxdSyncWatched: enabled };
}

export function useLetterboxdSyncTargets() {
  const { user } = useAuth();
  const { error, apply } = useOptimisticProfilePatch('auth.account.letterboxd.syncTargetsError');

  const change = (target: LetterboxdList, enabled: boolean) => {
    apply(patchFor(target, enabled));
  };

  return {
    watchlist: letterboxdSyncEnabled(user, 'watchlist'),
    watched: letterboxdSyncEnabled(user, 'watched'),
    error,
    change,
  };
}
