import type { ApiSchemas } from '@/shared/api/contract';
import type { UserProfile } from '@/features/auth/types';

export type LetterboxdSyncTarget = ApiSchemas['LetterboxdImportTarget'];

export function letterboxdSyncEnabled(
  user: UserProfile | null | undefined,
  target: LetterboxdSyncTarget
): boolean {
  if (!user) return false;
  return target === 'watchlist'
    ? (user.letterboxdSyncWatchlist ?? true)
    : (user.letterboxdSyncWatched ?? true);
}

export function syncsWithLetterboxd(
  user: UserProfile | null | undefined,
  target: LetterboxdSyncTarget
): boolean {
  return !!user?.letterboxdUsername && letterboxdSyncEnabled(user, target);
}
