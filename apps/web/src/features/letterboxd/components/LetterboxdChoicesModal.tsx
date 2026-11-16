import { useId, useState } from 'react';
import clsx from 'clsx';
import { Bookmark, Eye } from 'lucide-react';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useLocale, useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { formatShortDate } from '@/shared/utils/formatMyEventsListDate';
import { formatRating } from '@/shared/utils/formatRating';
import { metaGenresLabel, movieMetaLine } from '@/shared/utils/movieMetaLine';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  confirmLetterboxdChoices,
  type LetterboxdCandidate,
  type LetterboxdConfirmResult,
  type LetterboxdPendingChoice,
  type LetterboxdSelection,
  type LetterboxdWatchedSelection,
} from '@/features/letterboxd/api/letterboxdApi';
import { isWatchedChoice } from '@/features/letterboxd/utils/syncReport';
import styles from './LetterboxdChoicesModal.module.css';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import LinkButton from '@/shared/components/LinkButton';

interface LetterboxdChoicesModalProps {
  open: boolean;
  choices: LetterboxdPendingChoice[];
  onClose: () => void;
  onConfirmed: (result: LetterboxdConfirmResult, unresolved: LetterboxdPendingChoice[]) => void;
}

type Answer = { candidate: LetterboxdCandidate } | 'skip';

type Answers = Record<string, Answer | undefined>;

const SKIP_VALUE = 'skip';

function choiceKey(choice: LetterboxdPendingChoice): string {
  return `${choice.target ?? 'watchlist'}:${choice.rowIndex}`;
}

function chosenCandidate(answer: Answer | undefined): LetterboxdCandidate | null {
  return answer && answer !== 'skip' ? answer.candidate : null;
}

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
    genreIds: candidate.genreIds,
    letterboxdSlug,
  };
}

function toWatchedSelection(
  candidate: LetterboxdCandidate,
  choice: LetterboxdPendingChoice
): LetterboxdWatchedSelection {
  return {
    ...toSelection(candidate, choice.letterboxdSlug),
    runtimeMinutes: candidate.runtimeMinutes,
    rating: choice.rating ?? null,
    watchedOn: choice.watchedOn ?? null,
  };
}

function WatchedDetails({ choice }: Readonly<{ choice: LetterboxdPendingChoice }>) {
  const { t, locale } = useTranslation();
  const scale = useAuth().user?.ratingScale ?? 'five';
  const date = choice.watchedOn ? formatShortDate(choice.watchedOn, locale) : null;
  const rating = choice.rating == null ? null : formatRating(choice.rating, scale, locale);
  let text: string | null = null;
  if (date && rating) text = t('auth.account.letterboxd.choicesWatchedOnRated', { date, rating });
  else if (date) text = t('auth.account.letterboxd.choicesWatchedOn', { date });
  else if (rating) text = t('auth.account.letterboxd.choicesRated', { rating });
  return text ? <span className={styles.targetDetail}>{text}</span> : null;
}

function ChoiceTarget({ choice }: Readonly<{ choice: LetterboxdPendingChoice }>) {
  const { t } = useTranslation();
  const watched = isWatchedChoice(choice);
  return (
    <p className={styles.target}>
      <Chip size="sm" icon={watched ? Eye : Bookmark}>
        {watched ? t('watched.title') : t('watchlist.title')}
      </Chip>
      {watched ? <WatchedDetails choice={choice} /> : null}
    </p>
  );
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
  const [answers, setAnswers] = useState<Answers>({});

  const total = choices.length;
  const current = choices[index];
  const isLast = index === total - 1;
  const currentAnswer = current ? answers[choiceKey(current)] : undefined;

  const confirmAction = async (finalAnswers: Answers) => {
    const selections: LetterboxdSelection[] = [];
    const watchedSelections: LetterboxdWatchedSelection[] = [];
    const stillPending: LetterboxdPendingChoice[] = [];
    for (const choice of choices) {
      const candidate = chosenCandidate(finalAnswers[choiceKey(choice)]);
      if (!candidate) stillPending.push(choice);
      else if (isWatchedChoice(choice))
        watchedSelections.push(toWatchedSelection(candidate, choice));
      else selections.push(toSelection(candidate, choice.letterboxdSlug));
    }

    onConfirmed(
      await confirmLetterboxdChoices(selections, watchedSelections, stillPending.length),
      stillPending
    );
  };

  const {
    run: runConfirm,
    loading: confirming,
    error: confirmError,
  } = useAsyncAction(confirmAction, t('auth.account.letterboxd.choicesFallbackError'));

  if (!current) return null;

  const currentKey = choiceKey(current);

  const goToNext = (answerOverride?: Answer) => {
    const next = { ...answers, [currentKey]: answerOverride ?? currentAnswer };
    setAnswers(next);
    if (isLast) {
      void runConfirm(next);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const selectCandidate = (candidate: LetterboxdCandidate) =>
    setAnswers((prev) => ({ ...prev, [currentKey]: { candidate } }));

  const selectNone = () => setAnswers((prev) => ({ ...prev, [currentKey]: 'skip' }));

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
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      column
      title={
        total === 1
          ? t('auth.account.letterboxd.choicesTitleOne')
          : t('auth.account.letterboxd.choicesTitle', { count: total })
      }
      titleId={titleId}
      titleDetail={
        <span className={styles.progressDots} aria-hidden="true">
          {choices.map((choice, i) => (
            <span
              key={choiceKey(choice)}
              className={clsx(
                styles.progressDot,
                i < index && styles.progressDotDone,
                i === index && styles.progressDotCurrent
              )}
            />
          ))}
        </span>
      }
    >
      <p className={styles.intro}>
        {t('auth.account.letterboxd.choicesStepOf', { current: index + 1, total })}
      </p>

      <p className={styles.askedTitle}>
        <strong>{current.title}</strong>
        <span>{t('auth.account.letterboxd.choicesAskedFrom', { year: current.year })}</span>
      </p>

      <ChoiceTarget choice={current} />

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
        <LinkButton size="sm" onClick={decideLater} disabled={confirming}>
          {t('auth.account.letterboxd.choicesDecideLater')}
        </LinkButton>
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
