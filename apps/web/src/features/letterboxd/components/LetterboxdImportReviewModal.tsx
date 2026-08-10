import { useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import {
  confirmLetterboxdImport,
  type LetterboxdImportCandidate,
  type LetterboxdImportConfirmResult,
  type LetterboxdImportPreview,
  type LetterboxdImportRow,
  type LetterboxdImportSelection,
} from '@/features/letterboxd/api/letterboxdApi';
import styles from './LetterboxdImportReviewModal.module.css';

interface LetterboxdImportReviewModalProps {
  open: boolean;
  preview: LetterboxdImportPreview;
  onClose: () => void;
  onImported: (result: LetterboxdImportConfirmResult) => void;
}

function candidateKey(row: LetterboxdImportRow): string {
  return `row-${row.rowIndex}`;
}

function buildInitialSelection(rows: LetterboxdImportRow[]): Record<string, number | null> {
  return Object.fromEntries(
    rows.map((row) => [candidateKey(row), row.candidates[0]?.tmdbId ?? null])
  );
}

function selectionToImportSelection(
  candidate: LetterboxdImportCandidate,
  letterboxdSlug: string | null
): LetterboxdImportSelection {
  return {
    tmdbId: candidate.tmdbId,
    mediaType: candidate.mediaType,
    title: candidate.title,
    year: candidate.year,
    posterPath: candidate.posterPath,
    voteAverage: candidate.voteAverage,
    letterboxdSlug,
  };
}

export default function LetterboxdImportReviewModal({
  open,
  preview,
  onClose,
  onImported,
}: Readonly<LetterboxdImportReviewModalProps>) {
  const { t } = useTranslation();
  const dialogRef = useModalDialog(open, onClose);
  const titleId = useId();

  const alreadyInWatchlistCount = preview.rows.filter((r) => r.alreadyInWatchlist).length;
  const notFoundRows = preview.rows.filter(
    (r) => !r.alreadyInWatchlist && r.candidates.length === 0
  );
  const reviewRows = useMemo(
    () => preview.rows.filter((r) => !r.alreadyInWatchlist && r.candidates.length > 0),
    [preview.rows]
  );

  const [selectedByRow, setSelectedByRow] = useState<Record<string, number | null>>(() =>
    buildInitialSelection(reviewRows)
  );

  const selectedCount = Object.values(selectedByRow).filter((v) => v != null).length;

  const confirmAction = async () => {
    const selections = reviewRows
      .map((row) => {
        const chosenId = selectedByRow[candidateKey(row)];
        if (chosenId == null) return null;
        const candidate = row.candidates.find((c) => c.tmdbId === chosenId);
        return candidate ? selectionToImportSelection(candidate, row.letterboxdSlug) : null;
      })
      .filter((s): s is LetterboxdImportSelection => s !== null);

    const result = await confirmLetterboxdImport(selections);
    onImported(result);
  };

  const {
    run: runConfirm,
    loading: confirming,
    error: confirmError,
  } = useAsyncAction(confirmAction, t('auth.account.letterboxd.confirmFallbackError'));

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t('auth.account.letterboxd.reviewTitle')}
        </h2>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X aria-hidden size={18} />
        </button>
      </div>

      <p className={styles.summary}>
        {t('auth.account.letterboxd.reviewSummary', {
          total: String(preview.totalParsed),
          alreadyInWatchlist: String(alreadyInWatchlistCount),
          notFound: String(notFoundRows.length),
        })}
      </p>
      {preview.totalTruncated > 0 && (
        <p className={styles.truncatedNotice}>
          {t('auth.account.letterboxd.reviewTruncated', { count: String(preview.totalTruncated) })}
        </p>
      )}

      {confirmError && (
        <p className={styles.error} role="alert">
          {confirmError}
        </p>
      )}

      {reviewRows.length === 0 ? (
        <p className={styles.empty}>{t('auth.account.letterboxd.reviewNothingToImport')}</p>
      ) : (
        <ul className={styles.list}>
          {reviewRows.map((row) => {
            const rowKey = candidateKey(row);
            const selectedId = selectedByRow[rowKey] ?? null;
            return (
              <li key={rowKey} className={styles.row}>
                <p className={styles.rowSource}>
                  {t('auth.account.letterboxd.reviewFromLetterboxd', {
                    title: row.title,
                    year: row.year,
                  })}
                </p>
                <ul className={styles.candidateList}>
                  {row.candidates.map((candidate) => {
                    const posterRaw = posterImageSrc(candidate.posterPath);
                    const posterSrc = posterRaw
                      ? tmdbPosterSrcForListDisplay(posterRaw)
                      : undefined;
                    const inputId = `${rowKey}-${candidate.tmdbId}`;
                    return (
                      <li key={candidate.tmdbId} className={styles.candidateItem}>
                        <label htmlFor={inputId} className={styles.candidateLabel}>
                          <input
                            id={inputId}
                            type="radio"
                            name={rowKey}
                            checked={selectedId === candidate.tmdbId}
                            onChange={() =>
                              setSelectedByRow((prev) => ({ ...prev, [rowKey]: candidate.tmdbId }))
                            }
                          />
                          {posterSrc ? (
                            <img
                              src={posterSrc}
                              alt=""
                              className={styles.candidatePoster}
                              loading="lazy"
                            />
                          ) : (
                            <span
                              className={styles.candidatePosterPlaceholder}
                              aria-hidden="true"
                            />
                          )}
                          <span className={styles.candidateTitle}>
                            {candidate.title}
                            {candidate.year ? ` (${candidate.year})` : ''}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                  <li className={styles.candidateItem}>
                    <label htmlFor={`${rowKey}-skip`} className={styles.candidateLabel}>
                      <input
                        id={`${rowKey}-skip`}
                        type="radio"
                        name={rowKey}
                        checked={selectedId == null}
                        onChange={() => setSelectedByRow((prev) => ({ ...prev, [rowKey]: null }))}
                      />
                      <span className={styles.skipLabel}>
                        {t('auth.account.letterboxd.reviewSkipRow')}
                      </span>
                    </label>
                  </li>
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.footer}>
        <button type="button" className="btn" onClick={onClose} disabled={confirming}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void runConfirm()}
          disabled={confirming || selectedCount === 0}
        >
          {confirming
            ? t('auth.account.letterboxd.confirmSubmitting')
            : t('auth.account.letterboxd.confirmSubmit', { count: String(selectedCount) })}
        </button>
      </div>
    </dialog>
  );
}
