import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import {
  confirmLetterboxdChoices,
  type LetterboxdCandidate,
  type LetterboxdConfirmResult,
  type LetterboxdPendingChoice,
  type LetterboxdSelection,
} from '@/features/letterboxd/api/letterboxdApi';
import styles from './LetterboxdChoicesModal.module.css';

interface LetterboxdChoicesModalProps {
  open: boolean;
  choices: LetterboxdPendingChoice[];
  onClose: () => void;
  onConfirmed: (result: LetterboxdConfirmResult) => void;
}

function rowKey(choice: LetterboxdPendingChoice): string {
  return `row-${choice.rowIndex}`;
}

function toSelection(
  candidate: LetterboxdCandidate,
  letterboxdSlug: string | null
): LetterboxdSelection {
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

export default function LetterboxdChoicesModal({
  open,
  choices,
  onClose,
  onConfirmed,
}: Readonly<LetterboxdChoicesModalProps>) {
  const { t } = useTranslation();
  const dialogRef = useModalDialog(open, onClose);
  const titleId = useId();

  const [selectedByRow, setSelectedByRow] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(choices.map((c) => [rowKey(c), null]))
  );

  const selectedCount = Object.values(selectedByRow).filter((v) => v != null).length;

  const confirmAction = async () => {
    const selections = choices
      .map((choice) => {
        const chosenId = selectedByRow[rowKey(choice)];
        if (chosenId == null) return null;
        const candidate = choice.candidates.find((c) => c.tmdbId === chosenId);
        return candidate ? toSelection(candidate, choice.letterboxdSlug) : null;
      })
      .filter((s): s is LetterboxdSelection => s !== null);

    onConfirmed(await confirmLetterboxdChoices(selections));
  };

  const {
    run: runConfirm,
    loading: confirming,
    error: confirmError,
  } = useAsyncAction(confirmAction, t('auth.account.letterboxd.choicesFallbackError'));

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t('auth.account.letterboxd.choicesTitle')}
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

      <p className={styles.intro}>
        {t('auth.account.letterboxd.choicesIntro', { count: String(choices.length) })}
      </p>

      {confirmError && (
        <p className={styles.error} role="alert">
          {confirmError}
        </p>
      )}

      <ul className={styles.list}>
        {choices.map((choice) => {
          const key = rowKey(choice);
          const selectedId = selectedByRow[key] ?? null;
          return (
            <li key={key} className={styles.row}>
              <p className={styles.rowSource}>
                {t('auth.account.letterboxd.choicesFromLetterboxd', {
                  title: choice.title,
                  year: choice.year,
                })}
              </p>
              <ul className={styles.candidateList}>
                {choice.candidates.map((candidate) => {
                  const posterRaw = posterImageSrc(candidate.posterPath);
                  const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
                  const inputId = `${key}-${candidate.tmdbId}`;
                  return (
                    <li key={candidate.tmdbId} className={styles.candidateItem}>
                      <label htmlFor={inputId} className={styles.candidateLabel}>
                        <input
                          id={inputId}
                          type="radio"
                          name={key}
                          checked={selectedId === candidate.tmdbId}
                          onChange={() =>
                            setSelectedByRow((prev) => ({ ...prev, [key]: candidate.tmdbId }))
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
                          <span className={styles.candidatePosterPlaceholder} aria-hidden="true" />
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
                  <label htmlFor={`${key}-skip`} className={styles.candidateLabel}>
                    <input
                      id={`${key}-skip`}
                      type="radio"
                      name={key}
                      checked={selectedId == null}
                      onChange={() => setSelectedByRow((prev) => ({ ...prev, [key]: null }))}
                    />
                    <span className={styles.skipLabel}>
                      {t('auth.account.letterboxd.choicesSkip')}
                    </span>
                  </label>
                </li>
              </ul>
            </li>
          );
        })}
      </ul>

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
            ? t('auth.account.letterboxd.choicesSubmitting')
            : t('auth.account.letterboxd.choicesSubmit', { count: String(selectedCount) })}
        </button>
      </div>
    </dialog>
  );
}
