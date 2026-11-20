import { API_ERROR_REASONS } from '@/shared/api/apiError';
import type { Translate, TranslationKey } from '@/shared/i18n';
import type { UserProfile } from '@/features/auth/types';
import { letterboxdSyncEnabled } from '@/features/auth/utils/letterboxdSync';
import type {
  LetterboxdPendingChoice,
  LetterboxdSyncReport,
} from '@/features/letterboxd/api/letterboxdApi';

export const LETTERBOXD_MAX_CHOICES = 300;

export function pendingChoicesOf(report: LetterboxdSyncReport): LetterboxdPendingChoice[] {
  return [...report.pendingChoices, ...report.watchedPendingChoices];
}

export function watchedChanged(report: LetterboxdSyncReport): boolean {
  return report.watchedAdded > 0 || report.watchedRemoved > 0;
}

export function syncMeasureOf(report: LetterboxdSyncReport): {
  changed: boolean;
  pendingChoices: number;
} {
  return {
    changed: report.added > 0 || report.removed > 0 || watchedChanged(report),
    pendingChoices: pendingChoicesOf(report).length,
  };
}

export function isWatchedChoice(choice: LetterboxdPendingChoice): boolean {
  return choice.target === 'watched';
}

export interface ReportedLists {
  watchlist: boolean;
  watched: boolean;
}

export function reportedLists(
  report: LetterboxdSyncReport,
  user: UserProfile | null | undefined
): ReportedLists {
  return {
    watchlist:
      report.removed > 0 ||
      (letterboxdSyncEnabled(user, 'watchlist') &&
        report.error !== API_ERROR_REASONS.letterboxdWatchlistIncomplete),
    watched:
      letterboxdSyncEnabled(user, 'watched') &&
      report.error !== API_ERROR_REASONS.letterboxdWatchedIncomplete,
  };
}

export function unmatchedTitlesOf(report: LetterboxdSyncReport): string[] {
  return [...new Set([...report.unmatchedTitles, ...report.watchedUnmatchedTitles])];
}

const SYNC_ERROR_KEYS: Record<string, TranslationKey> = {
  [API_ERROR_REASONS.letterboxdWatchlistIncomplete]: 'apiErrors.letterboxd_watchlist_incomplete',
  [API_ERROR_REASONS.letterboxdWatchedIncomplete]: 'apiErrors.letterboxd_watched_incomplete',
  [API_ERROR_REASONS.letterboxdSyncUnavailable]: 'apiErrors.letterboxd_sync_unavailable',
  [API_ERROR_REASONS.letterboxdSyncFailed]: 'apiErrors.letterboxd_sync_failed',
};

export function syncErrorMessage(stored: string | null, t: Translate): string | null {
  if (stored === null) return null;
  const key = SYNC_ERROR_KEYS[stored];
  return key ? t(key) : stored;
}
