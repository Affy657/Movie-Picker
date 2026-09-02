import { useId, useRef, useState, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useLocale, useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { metaGenresLabel, movieMetaLine } from '@/shared/utils/movieMetaLine';
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
  onConfirmed: (result: LetterboxdConfirmResult, unresolved: LetterboxdPendingChoice[]) => void;
}

type Answer = { candidate: LetterboxdCandidate } | 'skip';

function selectedCandidateIndex(
  answer: Answer | undefined,
  candidates: LetterboxdCandidate[]
): number {
  if (answer === 'skip') return candidates.length;
  if (answer) return candidates.findIndex((c) => c.tmdbId === answer.candidate.tmdbId);
  return -1;
}

function confirmStepLabel(
  confirming: boolean,
  isLast: boolean,
  t: (key: TranslationKey) => string
): string {
  if (confirming) return t('auth.account.letterboxd.choicesSubmitting');
  if (isLast) return t('auth.account.letterboxd.choicesConfirmFinish');
  return t('auth.account.letterboxd.choicesConfirmNext');
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
  const { tmdbLanguage } = useLocale();
  const dialogRef = useModalDialog(open, onClose);
  const titleId = useId();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer | undefined>>({});
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = choices.length;
  const current = choices[index];
  const isLast = index === total - 1;
  const currentAnswer = current ? answers[current.rowIndex] : undefined;

  const confirmAction = async (finalAnswers: Record<number, Answer | undefined>) => {
    const selections = choices
      .map((choice) => {
        const answer = finalAnswers[choice.rowIndex];
        return answer && answer !== 'skip'
          ? toSelection(answer.candidate, choice.letterboxdSlug)
          : null;
      })
      .filter((s): s is LetterboxdSelection => s !== null);
    const unanswered = choices.filter((choice) => !finalAnswers[choice.rowIndex]);
    const remainingForApi = choices.filter((choice) => {
      const answer = finalAnswers[choice.rowIndex];
      return !answer || answer === 'skip';
    }).length;

    onConfirmed(await confirmLetterboxdChoices(selections, remainingForApi), unanswered);
  };

  const {
    run: runConfirm,
    loading: confirming,
    error: confirmError,
  } = useAsyncAction(confirmAction, t('auth.account.letterboxd.choicesFallbackError'));

  if (!current) return null;

  const goToNext = (answerOverride?: Answer) => {
    const next = { ...answers, [current.rowIndex]: answerOverride ?? currentAnswer };
    setAnswers(next);
    if (isLast) {
      void runConfirm(next);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const selectCandidate = (candidate: LetterboxdCandidate) =>
    setAnswers((prev) => ({ ...prev, [current.rowIndex]: { candidate } }));

  const selectNone = () => setAnswers((prev) => ({ ...prev, [current.rowIndex]: 'skip' }));

  const decideLater = () => void runConfirm(answers);

  const optionCount = current.candidates.length + 1;
  const selectedOptionIndex = selectedCandidateIndex(currentAnswer, current.candidates);

  const selectOptionAt = (i: number) => {
    const candidate = current.candidates[i];
    if (candidate) selectCandidate(candidate);
    else selectNone();
    optionRefs.current[i]?.focus();
  };

  const handleOptionKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        selectOptionAt((i + 1) % optionCount);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        selectOptionAt((i - 1 + optionCount) % optionCount);
        break;
      case 'Home':
        e.preventDefault();
        selectOptionAt(0);
        break;
      case 'End':
        e.preventDefault();
        selectOptionAt(optionCount - 1);
        break;
      default:
        break;
    }
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.header}>
        <div className={styles.headTextGroup}>
          <h2 id={titleId} className={styles.title}>
            {total === 1
              ? t('auth.account.letterboxd.choicesTitleOne')
              : t('auth.account.letterboxd.choicesTitle', { count: total })}
          </h2>
          <span className={styles.progressDots} aria-hidden="true">
            {choices.map((choice, i) => (
              <span
                key={choice.rowIndex}
                className={clsx(
                  styles.progressDot,
                  i < index && styles.progressDotDone,
                  i === index && styles.progressDotCurrent
                )}
              />
            ))}
          </span>
        </div>
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
        {t('auth.account.letterboxd.choicesStepOf', { current: index + 1, total })}
      </p>

      <p className={styles.askedTitle}>
        <strong>{current.title}</strong>
        <span>{t('auth.account.letterboxd.choicesAskedFrom', { year: current.year })}</span>
      </p>

      {confirmError && (
        <p className={styles.error} role="alert">
          {confirmError}
        </p>
      )}

      <ul
        className={styles.list}
        role="radiogroup"
        aria-label={t('auth.account.letterboxd.choicesRadioGroupAria', { title: current.title })}
      >
        {current.candidates.map((candidate, i) => {
          const posterRaw = posterImageSrc(candidate.posterPath);
          const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
          const genresLabel = metaGenresLabel(candidate.genreIds, tmdbLanguage);
          const runtimeLabel = formatRuntimeMinutes(candidate.runtimeMinutes);
          const metaLine = movieMetaLine(candidate.year, genresLabel, runtimeLabel);
          const selected =
            currentAnswer !== 'skip' && currentAnswer?.candidate.tmdbId === candidate.tmdbId;
          return (
            <li key={candidate.tmdbId}>
              <button
                type="button"
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="radio"
                aria-checked={selected}
                tabIndex={
                  i === selectedOptionIndex || (selectedOptionIndex === -1 && i === 0) ? 0 : -1
                }
                className={clsx(styles.choice, selected && styles.choiceSelected)}
                onClick={() => selectCandidate(candidate)}
                onKeyDown={(e) => handleOptionKeyDown(e, i)}
              >
                <span className={styles.choiceRadio} aria-hidden="true">
                  {selected && <Check size={12} aria-hidden />}
                </span>
                {posterSrc ? (
                  <img src={posterSrc} alt="" className={styles.choiceThumb} loading="lazy" />
                ) : (
                  <span className={styles.choiceThumbPlaceholder} aria-hidden="true" />
                )}
                <span className={styles.choiceText}>
                  <span className={styles.choiceTitle}>{candidate.title}</span>
                  {metaLine && <span className={styles.choiceMeta}>{metaLine}</span>}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            ref={(el) => {
              optionRefs.current[current.candidates.length] = el;
            }}
            role="radio"
            aria-checked={currentAnswer === 'skip'}
            tabIndex={selectedOptionIndex === current.candidates.length ? 0 : -1}
            className={clsx(
              styles.choice,
              styles.choiceNone,
              currentAnswer === 'skip' && styles.choiceSelected
            )}
            onClick={selectNone}
            onKeyDown={(e) => handleOptionKeyDown(e, current.candidates.length)}
          >
            <span className={styles.choiceRadio} aria-hidden="true">
              {currentAnswer === 'skip' && <Check size={12} aria-hidden />}
            </span>
            <span>{t('auth.account.letterboxd.choicesNoneOption')}</span>
          </button>
        </li>
      </ul>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.laterLink}
          onClick={decideLater}
          disabled={confirming}
        >
          {t('auth.account.letterboxd.choicesDecideLater')}
        </button>
        <div className={styles.footerActions}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => goToNext('skip')}
            disabled={confirming}
          >
            {t('auth.account.letterboxd.choicesSkipStep')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => goToNext()}
            disabled={confirming || currentAnswer === undefined}
          >
            {confirmStepLabel(confirming, isLast, t)}
          </button>
        </div>
      </div>
    </dialog>
  );
}
