import { useEffect, useState } from 'react';
import { Film, Star, Trophy } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ProposerBadge } from '@/features/movies/components/movieCardParts';
import MovieRatingDialog, {
  ratingCountLabel,
  type ParticipantRating,
} from '@/features/events/components/MovieRatingDialog';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { EventParticipantSummary } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { averageRating, formatRating } from '@/shared/utils/formatRating';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import styles from './EventWinnerSummary.module.css';

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
};

type Props = {
  winners: MovieData[];
  isFinished: boolean;
  participantAvatars?: Record<string, string>;
  rating?: WinnerRatingContext;
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

function WinnerRatingActions({
  movie,
  context,
}: Readonly<{ movie: MovieData; context: WinnerRatingContext }>) {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const rows = participantRatings(movie, context);
  const raters = rows.filter((r) => r.value !== null);
  const average = averageRating(raters.map((r) => r.value as number));
  const mine = rows.find((r) => r.isSelf)?.value ?? null;
  const canRate = context.currentParticipantId !== null;
  const autoOpen = canRate && context.autoOpenMovieId === movie.id;
  const { onAutoOpen } = context;
  useEffect(() => {
    if (!autoOpen) return;
    onAutoOpen?.();
    setAttempted(false);
    setOpen(true);
  }, [autoOpen, onAutoOpen]);
  if (!canRate && average === null) return null;

  const openDialog = () => {
    setAttempted(false);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const closeWhen = async (done: Promise<boolean>) => {
    setAttempted(true);
    if (await done) close();
  };

  return (
    <div className={styles.ratingActions}>
      {canRate ? (
        <Button
          type="button"
          size="sm"
          variant={mine === null ? 'primary' : 'secondary'}
          onClick={openDialog}
        >
          <Star
            size={ICON_SIZE.sm}
            aria-hidden
            className={mine === null ? undefined : styles.ratedStar}
          />
          {mine === null
            ? t('events.ratings.rateAction')
            : t('events.ratings.myRating', { value: formatRating(mine, context.scale, locale) })}
        </Button>
      ) : null}
      {average !== null ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={styles.averageButton}
          onClick={openDialog}
          aria-label={t('events.ratings.groupAria', {
            average: formatRating(average, context.scale, locale, { decimals: 1 }),
            count: ratingCountLabel(raters.length, t),
          })}
        >
          <AvatarStack
            people={raters.map((r) => ({
              key: r.participantId,
              avatarId: r.avatarId,
              pseudo: r.pseudo,
            }))}
            max={3}
          />
          <span className={styles.averageValue}>
            {formatRating(average, context.scale, locale, { decimals: 1 })}
          </span>
          <span className={styles.averageCount}>{ratingCountLabel(raters.length, t)}</span>
        </Button>
      ) : null}
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
          onSave={(value) => void closeWhen(context.onSave(movie.id, value))}
          onClear={() => void closeWhen(context.onClear(movie.id))}
        />
      ) : null}
    </div>
  );
}

function WinnerPoster({ posterPath }: Readonly<{ posterPath: string | null | undefined }>) {
  const src = posterImageSrc(posterPath);
  if (!src) {
    return (
      <span className={styles.posterPlaceholder} aria-hidden>
        <Film size={ICON_SIZE['2xl']} />
      </span>
    );
  }
  return (
    <img
      src={src}
      srcSet={tmdbPosterSrcSetForList(src)}
      sizes="64px"
      alt=""
      className={styles.poster}
      width={64}
      height={96}
      decoding="async"
    />
  );
}

export default function EventWinnerSummary({
  winners,
  isFinished,
  participantAvatars,
  rating,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (winners.length === 0) return null;
  const several = winners.length > 1;
  const heading = isFinished
    ? pluralizeCount(winners.length, 'events.winners.finishedOne', 'events.winners.finishedMany', t)
    : t('events.winners.upcoming');

  return (
    <Card as="section" padding="md" elevation="sm" className={styles.root} aria-label={heading}>
      <h2 className={styles.heading}>
        <Trophy size={ICON_SIZE.md} aria-hidden className={styles.headingIcon} />
        <span className={styles.headingLabel}>{heading}</span>
      </h2>
      <ol className={styles.list}>
        {winners.map((movie, index) => {
          const facts = [movie.year, formatRuntimeMinutes(movie.runtimeMinutes)].filter(Boolean);
          return (
            <li key={movie.id} className={styles.item}>
              <span className={styles.posterCol}>
                <WinnerPoster posterPath={movie.posterPath} />
                {several ? <span className={styles.rank}>{index + 1}</span> : null}
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
                {isFinished && rating ? (
                  <WinnerRatingActions movie={movie} context={rating} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
