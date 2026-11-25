import { API_ERROR_REASONS } from '@/shared/api/apiError';
import type { Translate, TranslationKey } from '@/shared/i18n';
import type {
  LetterboxdList,
  LetterboxdListReport,
  LetterboxdPendingChoice,
  LetterboxdSyncReport,
} from '@/features/letterboxd/api/letterboxdApi';

export const LETTERBOXD_MAX_CHOICES = 300;

const LIST_REPORT_KEYS: Record<
  LetterboxdList,
  { changes: TranslationKey; truncated: TranslationKey }
> = {
  watchlist: {
    changes: 'auth.account.letterboxd.reportChanges',
    truncated: 'auth.account.letterboxd.reportTruncated',
  },
  watched: {
    changes: 'auth.account.letterboxd.reportWatchedChanges',
    truncated: 'auth.account.letterboxd.reportWatchedPartial',
  },
};

export function pendingChoicesOf(report: LetterboxdSyncReport): LetterboxdPendingChoice[] {
  return report.lists.flatMap((list) => list.pendingChoices);
}

function changed(list: LetterboxdListReport): boolean {
  return list.added > 0 || list.removed > 0;
}

export function listChanged(report: LetterboxdSyncReport, target: LetterboxdList): boolean {
  return report.lists.some((list) => list.target === target && changed(list));
}

export function syncMeasureOf(report: LetterboxdSyncReport): {
  changed: boolean;
  pendingChoices: number;
} {
  return {
    changed: report.lists.some(changed),
    pendingChoices: pendingChoicesOf(report).length,
  };
}

export function isWatchedChoice(choice: LetterboxdPendingChoice): boolean {
  return choice.target === 'watched';
}

export function reportedLists(report: LetterboxdSyncReport): LetterboxdListReport[] {
  return report.lists.filter((list) => !list.incomplete || changed(list));
}

export function listChangesText(list: LetterboxdListReport, t: Translate): string {
  return t(LIST_REPORT_KEYS[list.target].changes, {
    added: String(list.added),
    removed: String(list.removed),
  });
}

export function truncatedLists(report: LetterboxdSyncReport): LetterboxdListReport[] {
  return report.lists.filter((list) => list.totalTruncated > 0);
}

export function listTruncatedText(list: LetterboxdListReport, t: Translate): string {
  return t(LIST_REPORT_KEYS[list.target].truncated, { count: String(list.totalTruncated) });
}

export function unmatchedTitlesOf(report: LetterboxdSyncReport): string[] {
  return [...new Set(report.lists.flatMap((list) => list.unmatchedTitles))];
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
