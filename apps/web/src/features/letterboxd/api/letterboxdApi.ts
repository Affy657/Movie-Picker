import { fetchApi, SLOW_REQUEST_TIMEOUT_MS } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import type { TitleSummary } from '@/shared/types/movie';

export type LetterboxdCandidate = ApiSchemas['LetterboxdImportCandidateResponse'];

export type LetterboxdPendingChoice = ApiSchemas['LetterboxdImportRowResponse'];

export type LetterboxdSyncReport = ApiSchemas['LetterboxdSyncResponse'];

export type LetterboxdSelection = TitleSummary & { letterboxdSlug: string | null };

export interface LetterboxdWatchedSelection extends TitleSummary {
  letterboxdSlug: string | null;
  rating?: number | null;
  watchedOn?: string | null;
}

export type LetterboxdConfirmResult = ApiSchemas['LetterboxdImportConfirmResponse'];

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
