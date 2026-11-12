import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Film, Info, LogIn, Star } from 'lucide-react';
import Button, { buttonClass } from '@/shared/components/Button';
import PosterBackdrop from '@/shared/components/PosterBackdrop';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ProposerBadge } from '@/features/movies/components/movieCardParts';
import MovieFacts from '@/features/movies/components/MovieFacts';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import { useOpenMoviePage } from '@/features/movies/hooks/useOpenMoviePage';
import MovieRatingDialog from '@/features/events/components/MovieRatingDialog';
import { hasRated, unratedWinners } from '@/features/events/hooks/useRatingLink';
import RatingNotes, {
  ratingCountLabel,
  type ParticipantRating,
} from '@/features/events/components/RatingNotes';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation, type Translate } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { EventParticipantSummary } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { averageOfRatings, formatRating } from '@/shared/utils/formatRating';
import { formatShortDate } from '@/shared/utils/formatMyEventsListDate';
import { daysUntilEventDate } from '@/shared/utils/formatRelativeEventDate';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { keepPunctuationAttached } from '@/shared/utils/keepPunctuationAttached';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import styles from './EventWinnerSummary.module.css';

export type WinnerRatingContext = {
  scale: RatingScale;
  participants: Pick<EventParticipantSummary, 'id' | 'pseudo' | 'avatarId'>[];
  currentParticipantId: string | null;
  error: string | null;
  onSave: (movieId: string, value: number) => Promise<boolean>;
  onClear: (movieId: string) => Promise<boolean>;
  autoOpenMovieId?: string | null;
  onAutoOpen?: () => void;
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
  scale?: RatingScale;
  nightSlug?: string;
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

function nextUnrated(winners: MovieData[], participantId: string, after: string): string | null {
  const index = winners.findIndex((movie) => movie.id === after);
  const ordered = [...winners.slice(index + 1), ...winners.slice(0, Math.max(index, 0))];
  const next = unratedWinners(ordered, participantId).find((movie) => movie.id !== after);
  return next?.id ?? null;
}

function firstToRate(winners: MovieData[], participantId: string | null): MovieData | undefined {
  return participantId ? unratedWinners(winners, participantId)[0] : undefined;
}

function isSoloNight(rating: WinnerRatingContext | undefined): boolean {
  if (!rating?.currentParticipantId) return false;
  const [only, ...others] = rating.participants;
  return others.length === 0 && only?.id === rating.currentParticipantId;
}

function HeroPoster({
  posterPath,
  className,
  sizes,
  iconSize = ICON_SIZE['4xl'],
}: Readonly<{
  posterPath: string | null | undefined;
  className?: string;
  sizes: string;
  iconSize?: number;
}>) {
  const src = posterImageSrc(posterPath);
  if (!src) {
    return (
      <span className={clsx(className, styles.posterPlaceholder)} aria-hidden>
        <Film size={iconSize} />
      </span>
    );
  }
  return (
    <img
      src={src}
      srcSet={tmdbPosterSrcSetForList(src)}
      sizes={sizes}
      alt=""
      className={className}
      decoding="async"
    />
  );
}

function SoloScoreLine({ mine, scale }: Readonly<{ mine: number | null; scale: RatingScale }>) {
  const { t, locale } = useTranslation();
  if (mine === null) return null;
  const value = formatRating(mine, scale, locale);
  const label = t('events.ratings.yourRating');
  return (
    <p className={styles.score}>
      <Star size={ICON_SIZE['2xl']} aria-hidden className={styles.scoreStar} />
      <span className="visually-hidden">{`${label} ${value}`}</span>
      <span className={styles.scoreValue} aria-hidden>
        {value}
      </span>
      <span className={styles.scoreCount} aria-hidden>
        {label}
      </span>
    </p>
  );
}

function ScoreLine({ movie, scale }: Readonly<{ movie: MovieData; scale: RatingScale }>) {
  const { t, locale } = useTranslation();
  const average = averageOfRatings(movie.ratings);
  if (average === null) return null;
  const value = formatRating(average, scale, locale, { decimals: 1 });
  const count = ratingCountLabel(movie.ratings?.length ?? 0, t);
  return (
    <p className={styles.score}>
      <Star size={ICON_SIZE['2xl']} aria-hidden className={styles.scoreStar} />
      <span className="visually-hidden">{`${t('events.ratings.average', { value })}, ${count}`}</span>
      <span className={styles.scoreValue} aria-hidden>
        {value}
      </span>
      <span className={styles.scoreCount} aria-hidden>
        {count}
      </span>
    </p>
  );
}

function ChipStatus({
  movie,
  rank,
  participantId,
  showRating,
  scale,
}: Readonly<{
  movie: MovieData;
  rank: number;
  participantId: string | null;
  showRating: boolean;
  scale: RatingScale;
}>) {
  const { t, locale } = useTranslation();
  if (!showRating) {
    return <span className={styles.chipStatus}>{t('events.wheel.winnerRankLabel', { rank })}</span>;
  }
  if (participantId && !hasRated(movie, participantId)) {
    return (
      <span className={clsx(styles.chipStatus, styles.chipToRate)}>
        {t('events.ratings.toRate')}
      </span>
    );
  }
  const average = averageOfRatings(movie.ratings);
  if (average === null) {
    return <span className={styles.chipStatus}>{t('events.ratings.pending')}</span>;
  }
  return (
    <span className={styles.chipStatus}>
      <Star size={ICON_SIZE.sm} aria-hidden className={styles.scoreStar} />
      {formatRating(average, scale, locale, { decimals: 1 })}
    </span>
  );
}

function WinnersStrip({
  winners,
  selectedId,
  participantId,
  showRating,
  scale,
  onSelect,
}: Readonly<{
  winners: MovieData[];
  selectedId: string;
  participantId: string | null;
  showRating: boolean;
  scale: RatingScale;
  onSelect: (movieId: string) => void;
}>) {
  const { t } = useTranslation();
  return (
    <ol className={styles.strip} aria-label={t('events.ratings.winnersStrip')}>
      {winners.map((movie, index) => (
        <li key={movie.id} className={styles.stripItem}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={movie.id === selectedId}
            onClick={() => onSelect(movie.id)}
          >
            <HeroPoster
              posterPath={movie.posterPath}
              className={styles.chipPoster}
              sizes="40px"
              iconSize={ICON_SIZE.md}
            />
            <span className={styles.chipText}>
              <span className={styles.chipTitle}>{keepPunctuationAttached(movie.title)}</span>
              <ChipStatus
                movie={movie}
                rank={index + 1}
                participantId={participantId}
                showRating={showRating}
                scale={scale}
              />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function PrimaryAction({
  movie,
  context,
  raters,
  mine,
  solo,
  onRate,
}: Readonly<{
  movie: MovieData;
  context: WinnerRatingContext;
  raters: number;
  mine: number | null;
  solo: boolean;
  onRate: () => void;
}>) {
  const { t } = useTranslation();
  if (context.currentParticipantId !== null) {
    if (mine !== null) {
      if (!solo) return null;
      return (
        <Button type="button" variant="secondary" onClick={onRate}>
          <Star size={ICON_SIZE.md} aria-hidden />
          {t('events.ratings.editRating')}
        </Button>
      );
    }
    const first = raters === 0 && !solo;
    return (
      <Button type="button" variant="primary" size="lg" className={styles.cta} onClick={onRate}>
        <Star size={ICON_SIZE.md} aria-hidden />
        {t(first ? 'events.ratings.firstRating' : 'events.ratings.rateAction')}
      </Button>
    );
  }
  const href = context.signInHref?.(movie.id);
  if (!href) return null;
  return (
    <Link
      to={href}
      className={buttonClass({ variant: 'primary', size: 'lg', className: styles.cta })}
    >
      <LogIn size={ICON_SIZE.md} aria-hidden />
      {t('events.ratings.signInToRate')}
    </Link>
  );
}

function upcomingHeading(date: string | undefined, t: Translate, locale: LocaleCode): string {
  const days = date ? daysUntilEventDate(date) : null;
  if (!date || days === null || days <= 0) return t('events.winners.upcoming');
  if (days === 1) return t('events.winners.upcomingTomorrow');
  return t('events.winners.upcomingOn', { date: formatShortDate(date, locale) });
}

function useRatingSheet(
  winners: MovieData[],
  rating: WinnerRatingContext | undefined,
  select: (movieId: string) => void
) {
  const [movieId, setMovieId] = useState<string | null>(null);
  const [previous, setPrevious] = useState<{ title: string; value: number } | null>(null);
  const linked = rating?.currentParticipantId ? (rating.autoOpenMovieId ?? null) : null;
  const onAutoOpen = rating?.onAutoOpen;

  const open = useCallback(
    (id: string) => {
      setPrevious(null);
      select(id);
      setMovieId(id);
    },
    [select]
  );

  useEffect(() => {
    if (!linked) return;
    onAutoOpen?.();
    open(linked);
  }, [linked, onAutoOpen, open]);

  const participantId = rating?.currentParticipantId ?? null;
  const nextId = movieId && participantId ? nextUnrated(winners, participantId, movieId) : null;
  const moveTo = (id: string, from: MovieData | undefined, value: number | null) => {
    setPrevious(from && value !== null ? { title: from.title, value } : null);
    select(id);
    setMovieId(id);
  };

  return { movieId, nextId, previous, open, moveTo, close: () => setMovieId(null) };
}

function ownRating(rows: ParticipantRating[]): number | null {
  return rows.find((row) => row.isSelf)?.value ?? null;
}

function WinnerNotes({
  movie,
  rating,
  scale,
  renderRating,
  onEdit,
}: Readonly<{
  movie: MovieData;
  rating: WinnerRatingContext | undefined;
  scale: RatingScale;
  renderRating: Props['renderRating'];
  onEdit: () => void;
}>) {
  const { t } = useTranslation();
  if (renderRating) return <div className={styles.notes}>{renderRating(movie)}</div>;
  if (!rating) return null;
  const rows = participantRatings(movie, rating);
  const canEdit = rating.currentParticipantId !== null && ownRating(rows) !== null;
  return (
    <div className={styles.notes}>
      <RatingNotes
        participants={rows}
        scale={scale}
        action={
          canEdit ? (
            <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
              <Star size={ICON_SIZE.sm} aria-hidden />
              {t('events.ratings.editRating')}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

function WinnerBody({
  movie,
  heading,
  avatarId,
  showRating,
  solo,
  rating,
  scale,
  action,
  onRate,
  onDetails,
}: Readonly<{
  movie: MovieData;
  heading: string;
  avatarId: string;
  showRating: boolean;
  solo: boolean;
  rating: WinnerRatingContext | undefined;
  scale: RatingScale;
  action: ReactNode;
  onRate: () => void;
  onDetails: () => void;
}>) {
  const { t } = useTranslation();
  const rows = rating ? participantRatings(movie, rating) : [];
  return (
    <div className={styles.body}>
      <p className={styles.overline}>{heading}</p>
      <h2 className={styles.title}>{keepPunctuationAttached(movie.title)}</h2>
      <div className={styles.meta}>
        <MovieFacts movie={movie} scale={scale} className={styles.facts} />
        <ProposerBadge
          avatarId={avatarId}
          pseudo={movie.proposerPseudo}
          handle={movie.proposerHandle}
          t={t}
        />
      </div>
      <WatchProviderChips
        providers={movie.watchProviders ?? []}
        watchPageUrl={movie.tmdbWatchPageUrl}
        maxVisible={4}
        className={styles.providers}
      />
      {showRating && solo ? <SoloScoreLine mine={ownRating(rows)} scale={scale} /> : null}
      {showRating && !solo ? <ScoreLine movie={movie} scale={scale} /> : null}
      <div className={styles.actions}>
        {showRating && rating ? (
          <PrimaryAction
            movie={movie}
            context={rating}
            raters={rows.filter((row) => row.value !== null).length}
            mine={ownRating(rows)}
            solo={solo}
            onRate={onRate}
          />
        ) : null}
        <Button type="button" variant="secondary" onClick={onDetails}>
          <Info size={ICON_SIZE.md} aria-hidden />
          {t('events.ratings.movieDetails')}
        </Button>
        {action}
      </div>
    </div>
  );
}

function SheetHost({
  winners,
  rating,
  scale,
  sheet,
}: Readonly<{
  winners: MovieData[];
  rating: WinnerRatingContext | undefined;
  scale: RatingScale;
  sheet: ReturnType<typeof useRatingSheet>;
}>) {
  const index = winners.findIndex((movie) => movie.id === sheet.movieId);
  const movie = winners[index];
  if (!rating || !movie) return null;
  const mine = ownRating(participantRatings(movie, rating));
  const { nextId } = sheet;
  return (
    <MovieRatingDialog
      key={movie.id}
      open
      onClose={sheet.close}
      movie={movie}
      mine={mine}
      scale={scale}
      error={rating.error}
      onSave={(value) => rating.onSave(movie.id, value)}
      onClear={() => rating.onClear(movie.id)}
      onNext={nextId ? (rated) => sheet.moveTo(nextId, movie, rated) : undefined}
      position={winners.length > 1 ? { index: index + 1, total: winners.length } : undefined}
      previous={sheet.previous}
    />
  );
}

function headingOf(
  count: number,
  isFinished: boolean,
  date: string | undefined,
  t: Translate,
  locale: LocaleCode
): string {
  if (!isFinished) return upcomingHeading(date, t, locale);
  return pluralizeCount(count, 'events.winners.finishedOne', 'events.winners.finishedMany', t);
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
  scale: scaleProp,
  nightSlug,
}: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const openMoviePage = useOpenMoviePage();
  const sheet = useRatingSheet(winners, rating, setSelectedId);
  const showRating = ratingOpen ?? isFinished;
  const solo = isSoloNight(rating);
  const toRate = showRating
    ? firstToRate(winners, rating?.currentParticipantId ?? null)
    : undefined;
  const selected = winners.find((movie) => movie.id === selectedId) ?? toRate ?? winners[0];
  if (!selected) return null;

  const scale = rating?.scale ?? scaleProp ?? 'five';
  const heading = headingOf(winners.length, isFinished, date, t, locale);
  const notes =
    showRating && !solo ? (
      <WinnerNotes
        movie={selected}
        rating={rating}
        scale={scale}
        renderRating={renderRating}
        onEdit={() => sheet.open(selected.id)}
      />
    ) : null;

  return (
    <>
      <section className={clsx('on-dark', styles.hero)} aria-label={heading}>
        <PosterBackdrop posterPath={selected.posterPath} direction={isMobile ? 'down' : 'side'} />
        <div className={styles.inner}>
          {winners.length > 1 ? (
            <WinnersStrip
              winners={winners}
              selectedId={selected.id}
              participantId={showRating ? (rating?.currentParticipantId ?? null) : null}
              showRating={showRating}
              scale={scale}
              onSelect={setSelectedId}
            />
          ) : null}
          <div className={styles.layout}>
            <HeroPoster posterPath={selected.posterPath} className={styles.poster} sizes="240px" />
            <WinnerBody
              movie={selected}
              heading={heading}
              avatarId={participantAvatars?.[getParticipantId(selected)] ?? ''}
              showRating={showRating}
              solo={solo}
              rating={rating}
              scale={scale}
              action={action}
              onRate={() => sheet.open(selected.id)}
              onDetails={() =>
                openMoviePage(
                  {
                    tmdbId: selected.tmdbId,
                    mediaType: selected.mediaType ?? 'movie',
                    title: selected.title,
                    year: selected.year,
                    posterPath: selected.posterPath,
                    voteAverage: selected.voteAverage,
                    runtimeMinutes: selected.runtimeMinutes,
                    genreIds: selected.genreIds,
                  },
                  nightSlug
                )
              }
            />
            {isMobile ? null : notes}
          </div>
        </div>
      </section>
      {rating?.error && sheet.movieId === null ? (
        <p className="error" role="alert">
          {rating.error}
        </p>
      ) : null}
      {isMobile ? notes : null}
      <SheetHost winners={winners} rating={rating} scale={scale} sheet={sheet} />
    </>
  );
}
