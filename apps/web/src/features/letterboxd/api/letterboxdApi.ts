import { fetchApi, SLOW_REQUEST_TIMEOUT_MS } from '@/shared/api/client';
import type { MovieMediaType } from '@/shared/types/movie';

export type LetterboxdImportTarget = 'watchlist' | 'watched';

export interface LetterboxdCandidate {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  genreIds?: number[];
  runtimeMinutes?: number | null;
}

export interface LetterboxdPendingChoice {
  rowIndex: number;
  title: string;
  year: string;
  letterboxdSlug: string | null;
  target?: LetterboxdImportTarget;
  rating?: number | null;
  watchedOn?: string | null;
  candidates: LetterboxdCandidate[];
}

export interface LetterboxdSyncReport {
  skipped: boolean;
  error: string | null;
  added: number;
  removed: number;
  unmatchedTitles: string[];
  pendingChoices: LetterboxdPendingChoice[];
  totalOnLetterboxd: number;
  totalTruncated: number;
  watchedAdded: number;
  watchedRemoved: number;
  watchedUnmatchedTitles: string[];
  watchedPendingChoices: LetterboxdPendingChoice[];
  watchedTotalOnLetterboxd: number;
  watchedTotalTruncated: number;
}

export interface LetterboxdSelection {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  genreIds?: number[];
  letterboxdSlug: string | null;
}

export interface LetterboxdWatchedSelection extends LetterboxdSelection {
  runtimeMinutes?: number | null;
  rating?: number | null;
  watchedOn?: string | null;
}

export interface LetterboxdConfirmResult {
  added: number;
  alreadyPresent: number;
  watchedAdded: number;
  watchedAlreadyPresent: number;
  pendingReconciliationCount: number;
}

export async function syncLetterboxd(force: boolean): Promise<LetterboxdSyncReport> {
  const report = await fetchApi<Partial<LetterboxdSyncReport>>(
    `/letterboxd/sync?force=${force ? 'true' : 'false'}`,
    { method: 'POST', timeoutMs: SLOW_REQUEST_TIMEOUT_MS }
  );
  return {
    skipped: report.skipped ?? false,
    error: report.error ?? null,
    added: report.added ?? 0,
    removed: report.removed ?? 0,
    unmatchedTitles: report.unmatchedTitles ?? [],
    pendingChoices: report.pendingChoices ?? [],
    totalOnLetterboxd: report.totalOnLetterboxd ?? 0,
    totalTruncated: report.totalTruncated ?? 0,
    watchedAdded: report.watchedAdded ?? 0,
    watchedRemoved: report.watchedRemoved ?? 0,
    watchedUnmatchedTitles: report.watchedUnmatchedTitles ?? [],
    watchedPendingChoices: (report.watchedPendingChoices ?? []).map((choice) => ({
      ...choice,
      target: 'watched',
    })),
    watchedTotalOnLetterboxd: report.watchedTotalOnLetterboxd ?? 0,
    watchedTotalTruncated: report.watchedTotalTruncated ?? 0,
  };
}

export async function confirmLetterboxdChoices(
  selections: LetterboxdSelection[],
  watchedSelections: LetterboxdWatchedSelection[],
  remainingUnresolvedCount: number
): Promise<LetterboxdConfirmResult> {
  const result = await fetchApi<Partial<LetterboxdConfirmResult>>('/letterboxd/confirm', {
    method: 'POST',
    body: JSON.stringify({ selections, watchedSelections, remainingUnresolvedCount }),
    timeoutMs: SLOW_REQUEST_TIMEOUT_MS,
  });
  return {
    added: result.added ?? 0,
    alreadyPresent: result.alreadyPresent ?? 0,
    watchedAdded: result.watchedAdded ?? 0,
    watchedAlreadyPresent: result.watchedAlreadyPresent ?? 0,
    pendingReconciliationCount: result.pendingReconciliationCount ?? remainingUnresolvedCount,
  };
}
