import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Film, LogIn, Star, Trophy } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Button, { buttonClass } from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ProposerBadge } from '@/features/movies/components/movieCardParts';
import MovieRatingDialog from '@/features/events/components/MovieRatingDialog';
import { ratingCountLabel, type ParticipantRating } from '@/features/events/components/RatingNotes';
import { useTranslation, type Translate } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { EventParticipantSummary } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { averageRating, formatRating } from '@/shared/utils/formatRating';
import { formatShortDate } from '@/shared/utils/formatMyEventsListDate';
import { daysUntilEventDate } from '@/shared/utils/formatRelativeEventDate';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import styles from './EventWinnerSummary.module.css';
import CountBadge from '@/shared/components/CountBadge';

export type WinnerRatingContext = {
  scale: RatingScale;
  participants: Pick<EventParticipantSummary, 'id' | 'pseudo' | 'avatarId'>[];
  currentParticipantId: string | null;
  saving: boolean;
  error: string | null;
  onSave: (movieId: string, value: number) => Promise<boolean>;
  onClear: (movieId: string) => Promise<boolean>;
  autoOpenMovieId?: string | null;
  onAutoOpen?: () => void;
  onRated?: (movieId: string) => void;
  signInHref?: (movieId: string) => string;
};

type Props = {
  winners: MovieData[];
  isFinished: boolean;
  ratingOpen?: boolean;
  date?: string;
  participantAvatars?: Record<string, string>;
  rating?: WinnerRatingContext;
  action?: ReactNode;
  renderRating?: (movie: MovieData) => ReactNode;
  posterSize?: 'md' | 'lg';
};

function participantRatings(movie: MovieData, context: WinnerRatingContext): ParticipantRating[] {
  const byParticipant = new Map((movie.ratings ?? []).map((r) => [r.participantId, r.value]));
  const rows = context.participants.map((p) => ({
    participantId: p.id,
    pseudo: p.pseudo,
    avatarId: p.avatarId ?? null,
    value: byParticipant.get(p.id) ?? null,
    isSelf: p.id === context.currentParticipantId,
  }));
  return [...rows.filter((r) => r.isSelf), ...rows.filter((r) => !r.isSelf)];
}

function RatingAverage({
  raters,
  average,
  scale,
  onOpen,
}: Readonly<{
  raters: ParticipantRating[];
  average: number;
  scale: RatingScale;
  onOpen?: () => void;
}>) {
  const { t, locale } = useTranslation();
  const averageLabel = formatRating(average, scale, locale, { decimals: 1 });
  const countLabel = ratingCountLabel(raters.length, t);
  const parts = (
    <>
      <AvatarStack
        people={raters.map((r) => ({
          key: r.participantId,
          avatarId: r.avatarId,
          pseudo: r.pseudo,
        }))}
        max={3}
      />
      <span className={styles.averageValue}>{averageLabel}</span>
      <span className={styles.averageCount}>{countLabel}</span>
    </>
  );

  if (!onOpen) {
    return (
      <>
        <span className="visually-hidden">
          {`${t('events.ratings.average', { value: averageLabel })}, ${countLabel}`}
        </span>
        <span className={styles.averageSummary} aria-hidden>
          {parts}
        </span>
      </>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={styles.averageButton}
      onClick={onOpen}
      aria-label={t('events.ratings.groupAria', { average: averageLabel, count: countLabel })}
    >
      {parts}
    </Button>
  );
}

function MyRatingButton({
  mine,
  scale,
  onOpen,
}: Readonly<{ mine: number | null; scale: RatingScale; onOpen: () => void }>) {
  const { t, locale } = useTranslation();
  const rated = mine !== null;
  return (
    <Button type="button" size="sm" variant={rated ? 'secondary' : 'primary'} onClick={onOpen}>
      <Star size={ICON_SIZE.sm} aria-hidden className={rated ? styles.ratedStar : undefined} />
      {rated
        ? t('events.ratings.myRating', { value: formatRating(mine, scale, locale) })
        : t('events.ratings.rateAction')}
    </Button>
  );
}

function SignInToRateLink({ href }: Readonly<{ href: string }>) {
  const { t } = useTranslation();
  return (
    <Link to={href} className={buttonClass({ variant: 'primary', size: 'sm' })}>
      <LogIn size={ICON_SIZE.sm} aria-hidden />
      {t('events.ratings.signInToRate')}
    </Link>
  );
}

function nextUnrated(winners: MovieData[], participantId: string, after: string): string | null {
  const index = winners.findIndex((movie) => movie.id === after);
  const ordered = [...winners.slice(index + 1), ...winners.slice(0, Math.max(index, 0))];
  const next = ordered.find(
    (movie) =>
      movie.id !== after &&
      !(movie.ratings ?? []).some((rating) => rating.participantId === participantId)
  );
  return next?.id ?? null;
}

function WinnerRatingActions({
  movie,
  context,
}: Readonly<{ movie: MovieData; context: WinnerRatingContext }>) {
  const [open, setOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const rows = participantRatings(movie, context);
  const raters = rows.filter((r) => r.value !== null);
  const average = averageRating(raters.map((r) => r.value as number));
  const mine = rows.find((r) => r.isSelf)?.value ?? null;
  const canRate = context.currentParticipantId !== null;
  const signInHref = canRate ? undefined : context.signInHref?.(movie.id);
  const autoOpen = canRate && context.autoOpenMovieId === movie.id;
  const { onAutoOpen } = context;
  useEffect(() => {
    if (!autoOpen) return;
    onAutoOpen?.();
    setAttempted(false);
    setOpen(true);
  }, [autoOpen, onAutoOpen]);
  if (!canRate && average === null && !signInHref) return null;

  const openDialog = () => {
    setAttempted(false);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const closeWhen = async (done: Promise<boolean>, then?: () => void) => {
    setAttempted(true);
    if (!(await done)) return;
    close();
    then?.();
  };

  return (
    <div className={styles.ratingActions}>
      {canRate ? <MyRatingButton mine={mine} scale={context.scale} onOpen={openDialog} /> : null}
      {signInHref ? <SignInToRateLink href={signInHref} /> : null}
      {average === null ? null : (
        <RatingAverage
          raters={raters}
          average={average}
          scale={context.scale}
          onOpen={canRate ? undefined : openDialog}
        />
      )}
      {open ? (
        <MovieRatingDialog
          open
          onClose={close}
          movie={movie}
          mine={mine}
          participants={rows}
          scale={context.scale}
          canRate={canRate}
          saving={context.saving}
          error={attempted ? context.error : null}
          onSave={(value) =>
            void closeWhen(context.onSave(movie.id, value), () => context.onRated?.(movie.id))
          }
          onClear={() => void closeWhen(context.onClear(movie.id))}
        />
      ) : null}
    </div>
  );
}

function WinnerPoster({
  posterPath,
  large,
}: Readonly<{ posterPath: string | null | undefined; large: boolean }>) {
  const src = posterImageSrc(posterPath);
  if (!src) {
    return (
      <span className={styles.posterPlaceholder} aria-hidden>
        <Film size={ICON_SIZE['2xl']} />
      </span>
    );
  }
  const width = large ? 112 : 64;
  return (
    <img
      src={src}
      srcSet={tmdbPosterSrcSetForList(src)}
      sizes={`${width}px`}
      alt=""
      className={styles.poster}
      width={width}
      height={Math.round(width * 1.5)}
      decoding="async"
    />
  );
}

function upcomingHeading(date: string | undefined, t: Translate, locale: LocaleCode): string {
  const days = date ? daysUntilEventDate(date) : null;
  if (!date || days === null || days <= 0) return t('events.winners.upcoming');
  if (days === 1) return t('events.winners.upcomingTomorrow');
  return t('events.winners.upcomingOn', { date: formatShortDate(date, locale) });
}

function useChainedRating(
  winners: MovieData[],
  rating: WinnerRatingContext | undefined
): WinnerRatingContext | undefined {
  const [nextToRate, setNextToRate] = useState<string | null>(null);
  const clearNext = useCallback(() => setNextToRate(null), []);
  if (!rating) return undefined;
  const linked = rating.autoOpenMovieId ?? null;
  const participantId = rating.currentParticipantId;
  return {
    ...rating,
    autoOpenMovieId: linked ?? nextToRate,
    onAutoOpen: linked ? rating.onAutoOpen : clearNext,
    onRated: (movieId) => {
      if (participantId) setNextToRate(nextUnrated(winners, participantId, movieId));
    },
  };
}

export default function EventWinnerSummary({
  winners,
  isFinished,
  ratingOpen,
  date,
  participantAvatars,
  rating,
  action,
  renderRating,
  posterSize = 'md',
}: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const ratingContext = useChainedRating(winners, rating);
  if (winners.length === 0) return null;
  const showRating = ratingOpen ?? isFinished;
  const several = winners.length > 1;
  const heading = isFinished
    ? pluralizeCount(winners.length, 'events.winners.finishedOne', 'events.winners.finishedMany', t)
    : upcomingHeading(date, t, locale);

  return (
    <Card as="section" padding="md" elevation="sm" className={styles.root} aria-label={heading}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>
          <Trophy size={ICON_SIZE.md} aria-hidden className={styles.headingIcon} />
          <span className={styles.headingLabel}>{heading}</span>
        </h2>
        {action}
      </div>
      <ol className={styles.list}>
        {winners.map((movie, index) => {
          const facts = [movie.year, formatRuntimeMinutes(movie.runtimeMinutes)].filter(Boolean);
          return (
            <li
              key={movie.id}
              className={clsx(styles.item, posterSize === 'lg' && styles.itemLarge)}
            >
              <span className={styles.posterCol}>
                <WinnerPoster posterPath={movie.posterPath} large={posterSize === 'lg'} />
                {several ? (
                  <CountBadge value={index + 1} tone="success" className={styles.rank} />
                ) : null}
              </span>
              <div className={styles.body}>
                <span className={styles.title}>{movie.title}</span>
                {facts.length > 0 ? (
                  <span className={styles.facts}>
                    {facts.map((fact) => (
                      <span key={fact}>{fact}</span>
                    ))}
                  </span>
                ) : null}
                <ProposerBadge
                  avatarId={participantAvatars?.[getParticipantId(movie)] ?? ''}
                  pseudo={movie.proposerPseudo}
                  handle={movie.proposerHandle}
                  t={t}
                />
                {!renderRating && showRating && ratingContext ? (
                  <WinnerRatingActions movie={movie} context={ratingContext} />
                ) : null}
              </div>
              {renderRating ? <div className={styles.below}>{renderRating(movie)}</div> : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
