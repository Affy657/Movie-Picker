import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  importLetterboxdExportRows,
  LETTERBOXD_EXPORT_BATCH,
  readLetterboxdExport,
  type LetterboxdConfirmResult,
  type LetterboxdExport,
  type LetterboxdExportRow,
  type LetterboxdList,
  type LetterboxdPendingChoice,
} from '@/features/letterboxd/api/letterboxdApi';
import { invalidateWatched } from '@/features/movies/hooks/invalidateWatched';
import { invalidateWatchlist } from '@/features/movies/hooks/useWatchlist';
import { ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { useHoldPage } from '@/shared/pwa/pageHold';

export const LETTERBOXD_EXPORT_MAX_FILE_BYTES = 12_000_000;

export interface ListTally {
  added: number;
  alreadyPresent: number;
}

export interface LetterboxdExportReport {
  watched: ListTally | null;
  watchlist: ListTally | null;
  pending: LetterboxdPendingChoice[];
  unmatched: string[];
  done: number;
  total: number;
  outcome: 'finished' | 'stopped' | 'failed';
}

export type ExportImportStep =
  | { kind: 'choose'; error: string | null }
  | { kind: 'reading' }
  | { kind: 'summary'; exported: LetterboxdExport }
  | { kind: 'importing'; done: number; total: number }
  | { kind: 'done'; report: LetterboxdExportReport };

export type ExportTargets = Record<LetterboxdList, boolean>;

interface Batch {
  target: LetterboxdList;
  rows: LetterboxdExportRow[];
}

const TARGET_ORDER: readonly LetterboxdList[] = ['watched', 'watchlist'];

function batchesOf(exported: LetterboxdExport, targets: ExportTargets): Batch[] {
  const batches: Batch[] = [];
  let rowIndex = 0;
  for (const target of TARGET_ORDER) {
    if (!targets[target]) continue;
    const films = target === 'watched' ? exported.watched : exported.watchlist;
    const rows = films.map((film) => ({
      rowIndex: ++rowIndex,
      title: film.title,
      year: film.year,
      rating: target === 'watched' ? (film.rating ?? null) : null,
      watchedOn: target === 'watched' ? (film.watchedOn ?? null) : null,
    }));
    for (let start = 0; start < rows.length; start += LETTERBOXD_EXPORT_BATCH)
      batches.push({ target, rows: rows.slice(start, start + LETTERBOXD_EXPORT_BATCH) });
  }
  return batches;
}

function emptyReport(targets: ExportTargets, total: number): LetterboxdExportReport {
  const tally = (on: boolean) => (on ? { added: 0, alreadyPresent: 0 } : null);
  return {
    watched: tally(targets.watched),
    watchlist: tally(targets.watchlist),
    pending: [],
    unmatched: [],
    done: 0,
    total,
    outcome: 'finished',
  };
}

function withConfirmed(
  report: LetterboxdExportReport,
  result: LetterboxdConfirmResult,
  pending: LetterboxdPendingChoice[]
): LetterboxdExportReport {
  const grow = (tally: ListTally | null, added: number) =>
    tally ? { ...tally, added: tally.added + added } : tally;
  return {
    ...report,
    watched: grow(report.watched, result.watchedAdded),
    watchlist: grow(report.watchlist, result.added),
    pending,
  };
}

export function useLetterboxdExportImport() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ExportImportStep>({ kind: 'choose', error: null });
  const stopRequested = useRef(false);
  useHoldPage(step.kind === 'importing');

  useEffect(
    () => () => {
      stopRequested.current = true;
    },
    []
  );

  const read = useCallback(
    async (files: readonly File[]) => {
      if (files.length === 0) return;
      if (files.some((file) => file.size > LETTERBOXD_EXPORT_MAX_FILE_BYTES)) {
        setStep({ kind: 'choose', error: t('auth.account.letterboxd.export.tooLarge') });
        return;
      }
      setStep({ kind: 'reading' });
      try {
        setStep({ kind: 'summary', exported: await readLetterboxdExport(files) });
      } catch (error) {
        setStep({
          kind: 'choose',
          error: ApiError.is(error) ? error.message : t('auth.account.letterboxd.export.readError'),
        });
      }
    },
    [t]
  );

  const start = useCallback(
    async (exported: LetterboxdExport, targets: ExportTargets) => {
      stopRequested.current = false;
      const batches = batchesOf(exported, targets);
      const report = emptyReport(
        targets,
        batches.reduce((sum, batch) => sum + batch.rows.length, 0)
      );
      setStep({ kind: 'importing', done: 0, total: report.total });
      for (const batch of batches) {
        if (stopRequested.current) {
          report.outcome = 'stopped';
          break;
        }
        try {
          const result = await importLetterboxdExportRows(batch.target, batch.rows);
          const tally = report[batch.target]!;
          tally.added += result.added;
          tally.alreadyPresent += result.alreadyPresent;
          report.pending.push(...result.pendingChoices);
          report.unmatched.push(...result.unmatchedTitles);
        } catch {
          report.outcome = 'failed';
          break;
        }
        report.done += batch.rows.length;
        setStep({ kind: 'importing', done: report.done, total: report.total });
      }
      await Promise.all([
        invalidateWatched(queryClient),
        invalidateWatchlist(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
      ]);
      setStep({ kind: 'done', report: { ...report } });
    },
    [queryClient]
  );

  const stop = useCallback(() => {
    stopRequested.current = true;
  }, []);

  const confirmed = useCallback(
    (result: LetterboxdConfirmResult, stillPending: LetterboxdPendingChoice[]) => {
      setStep((current) =>
        current.kind === 'done'
          ? { kind: 'done', report: withConfirmed(current.report, result, stillPending) }
          : current
      );
      void invalidateWatched(queryClient);
      void invalidateWatchlist(queryClient);
    },
    [queryClient]
  );

  const restart = useCallback(() => setStep({ kind: 'choose', error: null }), []);

  return { step, read, start, stop, confirmed, restart };
}
