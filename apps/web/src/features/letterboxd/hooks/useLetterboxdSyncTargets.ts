import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useOptimisticProfilePatch } from '@/features/auth/hooks/useOptimisticProfilePatch';
import type { ProfilePatch } from '@/features/auth/api/authApi';
import {
  letterboxdSyncEnabled,
  type LetterboxdSyncTarget,
} from '@/features/auth/utils/letterboxdSync';

function patchFor(target: LetterboxdSyncTarget, enabled: boolean): ProfilePatch {
  return target === 'watchlist'
    ? { letterboxdSyncWatchlist: enabled }
    : { letterboxdSyncWatched: enabled };
}

export function useLetterboxdSyncTargets() {
  const { user } = useAuth();
  const { error, apply } = useOptimisticProfilePatch('auth.account.letterboxd.syncTargetsError');

  const change = (target: LetterboxdSyncTarget, enabled: boolean) => {
    apply(patchFor(target, enabled));
  };

  return {
    watchlist: letterboxdSyncEnabled(user, 'watchlist'),
    watched: letterboxdSyncEnabled(user, 'watched'),
    error,
    change,
  };
}
