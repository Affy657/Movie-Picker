import { useId, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
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
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface LetterboxdChoicesModalProps {
  open: boolean;
  choices: LetterboxdPendingChoice[];
  onClose: () => void;
  onConfirmed: (result: LetterboxdConfirmResult, unresolved: LetterboxdPendingChoice[]) => void;
}

type Answer = { candidate: LetterboxdCandidate } | 'skip';

const SKIP_VALUE = 'skip';

function choiceValueOf(answer: Answer | undefined): string | null {
  if (answer === 'skip') return SKIP_VALUE;
  return answer ? String(answer.candidate.tmdbId) : null;
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
  const titleId = useId();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer | undefined>>({});

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

  const choiceValue = choiceValueOf(currentAnswer);

  const selectByValue = (value: string) => {
    if (value === SKIP_VALUE) {
      selectNone();
      return;
    }
    const candidate = current.candidates.find((c) => String(c.tmdbId) === value);
    if (candidate) selectCandidate(candidate);
  };

  const decideLater = () => void runConfirm(answers);

  return (
    <Modal open={open} onClose={onClose} size="md" column ariaLabelledBy={titleId}>
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
        <IconButton ariaLabel={t('common.close')} onClick={onClose}>
          <X aria-hidden size={ICON_SIZE.lg} />
        </IconButton>
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

      <ChoiceGroup
        value={choiceValue}
        onChange={selectByValue}
        className={styles.list}
        ariaLabel={t('auth.account.letterboxd.choicesRadioGroupAria', { title: current.title })}
      >
        {current.candidates.map((candidate) => {
          const posterRaw = posterImageSrc(candidate.posterPath);
          const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
          const genresLabel = metaGenresLabel(candidate.genreIds, tmdbLanguage);
          const runtimeLabel = formatRuntimeMinutes(candidate.runtimeMinutes);
          const metaLine = movieMetaLine(candidate.year, genresLabel, runtimeLabel);
          return (
            <ChoiceCard
              key={candidate.tmdbId}
              value={String(candidate.tmdbId)}
              indicator
              title={candidate.title}
              description={metaLine || undefined}
            >
              {posterSrc ? (
                <img src={posterSrc} alt="" className={styles.choiceThumb} loading="lazy" />
              ) : (
                <span className={styles.choiceThumbPlaceholder} aria-hidden="true" />
              )}
            </ChoiceCard>
          );
        })}
        <ChoiceCard value={SKIP_VALUE} indicator dashed>
          {t('auth.account.letterboxd.choicesNoneOption')}
        </ChoiceCard>
      </ChoiceGroup>

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
          <Button
            type="button"
            variant="ghost"
            onClick={() => goToNext('skip')}
            disabled={confirming}
          >
            {t('auth.account.letterboxd.choicesSkipStep')}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => goToNext()}
            disabled={confirming || currentAnswer === undefined}
          >
            {confirmStepLabel(confirming, isLast, t)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
