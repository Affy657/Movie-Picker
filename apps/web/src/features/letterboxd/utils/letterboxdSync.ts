import type { UserProfile } from '@/features/auth/types';
import type { LetterboxdList } from '@/features/letterboxd/api/letterboxdApi';

export function letterboxdSyncEnabled(
  user: UserProfile | null | undefined,
  target: LetterboxdList
): boolean {
  if (!user) return false;
  return target === 'watchlist'
    ? (user.letterboxdSyncWatchlist ?? true)
    : (user.letterboxdSyncWatched ?? true);
}

export function syncsWithLetterboxd(
  user: UserProfile | null | undefined,
  target: LetterboxdList
): boolean {
  return !!user?.letterboxdUsername && letterboxdSyncEnabled(user, target);
}
