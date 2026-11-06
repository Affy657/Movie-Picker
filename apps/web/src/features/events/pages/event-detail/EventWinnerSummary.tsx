import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Film, Info, LogIn, Star } from 'lucide-react';
import Button, { buttonClass } from '@/shared/components/Button';
import PosterBackdrop from '@/shared/components/PosterBackdrop';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ProposerBadge } from '@/features/movies/components/movieCardParts';
import LazyMovieDetailsModal from '@/features/movies/components/LazyMovieDetailsModal';
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
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
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

function HeroPoster({
  posterPath,
  className,
  sizes,
}: Readonly<{ posterPath: string | null | undefined; className?: string; sizes: string }>) {
  const src = posterImageSrc(posterPath);
  if (!src) {
    return (
      <span className={clsx(className, styles.posterPlaceholder)} aria-hidden>
        <Film size={ICON_SIZE['4xl']} />
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

function MovieTiles({
  winners,
  selectedId,
  participantId,
  scale,
  onSelect,
  onRate,
}: Readonly<{
  winners: MovieData[];
  selectedId: string;
  participantId: string | null;
  scale: RatingScale;
  onSelect: (movieId: string) => void;
  onRate: (movieId: string) => void;
}>) {
  const { t, locale } = useTranslation();
  return (
    <ol className={styles.tiles}>
      {winners.map((movie) => {
        const average = averageOfRatings(movie.ratings);
        const rated = hasRated(movie, participantId);
        return (
          <li key={movie.id} className={styles.tile}>
            <button
              type="button"
              className={styles.tileButton}
              aria-pressed={movie.id === selectedId}
              aria-label={movie.title}
              onClick={() => onSelect(movie.id)}
            >
              <HeroPoster
                posterPath={movie.posterPath}
                className={styles.tilePoster}
                sizes="150px"
              />
            </button>
            {participantId && !rated ? (
              <Button
                type="button"
                variant="soft"
                size="sm"
                aria-label={t('events.ratings.toRateMovie', { title: movie.title })}
                onClick={() => onRate(movie.id)}
              >
                {t('events.ratings.toRate')}
              </Button>
            ) : null}
            {(!participantId || rated) && average !== null ? (
              <span className={styles.tileScore}>
                <Star size={ICON_SIZE.sm} aria-hidden className={styles.scoreStar} />
                {formatRating(average, scale, locale, { decimals: 1 })}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function PrimaryAction({
  movie,
  context,
  raters,
  mine,
  onRate,
}: Readonly<{
  movie: MovieData;
  context: WinnerRatingContext;
  raters: number;
  mine: number | null;
  onRate: () => void;
}>) {
  const { t } = useTranslation();
  if (context.currentParticipantId !== null) {
    if (mine !== null) return null;
    return (
      <Button type="button" variant="primary" size="lg" className={styles.cta} onClick={onRate}>
        <Star size={ICON_SIZE.md} aria-hidden />
        {t(raters === 0 ? 'events.ratings.firstRating' : 'events.ratings.rateAction')}
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
  rating: WinnerRatingContext | undefined;
  scale: RatingScale;
  action: ReactNode;
  onRate: () => void;
  onDetails: () => void;
}>) {
  const { t } = useTranslation();
  const facts = [movie.year, formatRuntimeMinutes(movie.runtimeMinutes)].filter(Boolean);
  const rows = rating ? participantRatings(movie, rating) : [];
  return (
    <div className={styles.body}>
      <p className={styles.overline}>{heading}</p>
      <h2 className={styles.title}>{keepPunctuationAttached(movie.title)}</h2>
      <div className={styles.meta}>
        <span className={styles.facts}>
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </span>
        <ProposerBadge
          avatarId={avatarId}
          pseudo={movie.proposerPseudo}
          handle={movie.proposerHandle}
          t={t}
        />
      </div>
      {showRating ? <ScoreLine movie={movie} scale={scale} /> : null}
      <div className={styles.actions}>
        {showRating && rating ? (
          <PrimaryAction
            movie={movie}
            context={rating}
            raters={rows.filter((row) => row.value !== null).length}
            mine={ownRating(rows)}
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

function MovieDetails({
  movie,
  scale,
  onClose,
}: Readonly<{ movie: MovieData; scale: RatingScale; onClose: () => void }>) {
  return (
    <LazyMovieDetailsModal
      open
      tmdbId={movie.tmdbId}
      mediaType={movie.mediaType}
      title={movie.title}
      year={movie.year}
      posterPath={movie.posterPath}
      voteAverage={movie.voteAverage}
      runtimeMinutes={movie.runtimeMinutes}
      ratingScale={scale}
      watchProviders={movie.watchProviders}
      watchPageUrl={movie.tmdbWatchPageUrl}
      onClose={onClose}
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
}: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const sheet = useRatingSheet(winners, rating, setSelectedId);
  const showRating = ratingOpen ?? isFinished;
  const toRate = showRating
    ? firstToRate(winners, rating?.currentParticipantId ?? null)
    : undefined;
  const selected = winners.find((movie) => movie.id === selectedId) ?? toRate ?? winners[0];
  if (!selected) return null;

  const scale = rating?.scale ?? scaleProp ?? 'five';
  const heading = headingOf(winners.length, isFinished, date, t, locale);
  const notes = showRating ? (
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
          <div className={styles.layout}>
            {winners.length > 1 ? (
              <MovieTiles
                winners={winners}
                selectedId={selected.id}
                participantId={showRating ? (rating?.currentParticipantId ?? null) : null}
                scale={scale}
                onSelect={setSelectedId}
                onRate={sheet.open}
              />
            ) : (
              <HeroPoster
                posterPath={selected.posterPath}
                className={styles.poster}
                sizes="240px"
              />
            )}
            <WinnerBody
              movie={selected}
              heading={heading}
              avatarId={participantAvatars?.[getParticipantId(selected)] ?? ''}
              showRating={showRating}
              rating={rating}
              scale={scale}
              action={action}
              onRate={() => sheet.open(selected.id)}
              onDetails={() => setDetailsOpen(true)}
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
      {detailsOpen ? (
        <MovieDetails movie={selected} scale={scale} onClose={() => setDetailsOpen(false)} />
      ) : null}
    </>
  );
}
