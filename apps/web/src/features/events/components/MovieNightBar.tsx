import { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import {
  ArrowLeft,
  Disc3,
  Eye,
  MoreHorizontal,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useMovieNight, type MovieNightTarget } from '@/features/events/hooks/useMovieNight';
import EventActionErrorBanner from '@/features/events/pages/event-detail/EventActionErrorBanner';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import IconButton from '@/shared/components/IconButton';
import { MenuItem, MenuPanel } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { MovieData } from '@/shared/types/movie';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import styles from './MovieNightBar.module.css';

type Night = ReturnType<typeof useMovieNight>;

interface MovieNightBarProps extends MovieNightTarget {
  onBack: () => void;
  onRemoved: () => void;
}

function signedScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function NightScore({ movie, t }: Readonly<{ movie: MovieData; t: Translate }>) {
  return (
    <p className={styles.score}>
      <strong
        className={clsx(
          styles.scoreValue,
          movie.score > 0 && styles.scorePositive,
          movie.score < 0 && styles.scoreNegative
        )}
      >
        {signedScore(movie.score)}
      </strong>
      <span className={styles.scoreBreakdown}>
        {t('moviePage.night.scoreBreakdown', { up: movie.up, down: movie.down })}
      </span>
    </p>
  );
}

function VoteButtons({
  movie,
  onVote,
  t,
}: Readonly<{ movie: MovieData; onVote: (value: 1 | -1) => void; t: Translate }>) {
  return (
    <fieldset className={styles.vote}>
      <legend className="visually-hidden">{t('moviePage.night.myVote')}</legend>
      <Button
        size="sm"
        variant={movie.myVote === 1 ? 'primary' : 'secondary'}
        aria-pressed={movie.myVote === 1}
        onClick={() => onVote(1)}
      >
        <ThumbsUp aria-hidden size={ICON_SIZE.sm} />
        {t('moviePage.night.voteUp')}
      </Button>
      <Button
        size="sm"
        variant={movie.myVote === -1 ? 'primary' : 'secondary'}
        tone={movie.myVote === -1 ? 'danger' : 'default'}
        aria-pressed={movie.myVote === -1}
        onClick={() => onVote(-1)}
      >
        <ThumbsDown aria-hidden size={ICON_SIZE.sm} />
        {t('moviePage.night.voteDown')}
      </Button>
    </fieldset>
  );
}

function SeenToggle({
  night,
  compact,
  t,
}: Readonly<{ night: Night; compact: boolean; t: Translate }>) {
  const label = t('moviePage.night.seen');
  if (compact) {
    return (
      <IconButton
        ariaLabel={label}
        aria-pressed={night.iMarkedSeen}
        loading={night.seenPending}
        className={clsx(night.iMarkedSeen && styles.seenOn)}
        onClick={() => void night.toggleSeen()}
      >
        <Eye aria-hidden size={ICON_SIZE.md} />
      </IconButton>
    );
  }
  return (
    <Button
      size="sm"
      variant={night.iMarkedSeen ? 'soft' : 'ghost'}
      aria-pressed={night.iMarkedSeen}
      loading={night.seenPending}
      onClick={() => void night.toggleSeen()}
    >
      <Eye aria-hidden size={ICON_SIZE.sm} />
      {label}
    </Button>
  );
}

function MoreActions({
  night,
  onRequestRemove,
  t,
}: Readonly<{ night: Night; onRequestRemove: () => void; t: Translate }>) {
  const menu = useMenuState();
  const movie = night.movie;
  if (!movie || (!night.canToggleWheel && !night.canRemove)) return null;
  const label = t('moviePage.night.moreActions');
  return (
    <div ref={menu.containerRef} className={styles.menu}>
      <IconButton {...menu.triggerProps} ariaLabel={label} showTitle={false}>
        <MoreHorizontal aria-hidden size={ICON_SIZE.md} />
      </IconButton>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={label}>
          {night.canToggleWheel ? (
            <MenuItem
              icon={
                movie.excludedFromWheel ? (
                  <RotateCcw size={ICON_SIZE.sm} aria-hidden />
                ) : (
                  <Disc3 size={ICON_SIZE.sm} aria-hidden />
                )
              }
              onClick={() => {
                menu.close();
                void night.toggleWheel();
              }}
            >
              {t(
                movie.excludedFromWheel
                  ? 'movies.list.includeInWheelAction'
                  : 'movies.list.excludeFromWheelAction'
              )}
            </MenuItem>
          ) : null}
          {night.canRemove ? (
            <MenuItem
              tone="danger"
              icon={<Trash2 size={ICON_SIZE.sm} aria-hidden />}
              onClick={() => {
                menu.close();
                onRequestRemove();
              }}
            >
              {t('movies.list.removeButton')}
            </MenuItem>
          ) : null}
        </MenuPanel>
      ) : null}
    </div>
  );
}

function NightActions({
  night,
  compact,
  slug,
  onRequestRemove,
  t,
}: Readonly<{
  night: Night;
  compact: boolean;
  slug: string;
  onRequestRemove: () => void;
  t: Translate;
}>) {
  const movie = night.movie;
  if (!movie) return null;
  return (
    <div className={styles.actions}>
      <NightScore movie={movie} t={t} />
      {night.canAct ? (
        <>
          <VoteButtons movie={movie} onVote={night.vote} t={t} />
          <SeenToggle night={night} compact={compact} t={t} />
        </>
      ) : null}
      {!night.participant && !night.event?.isFinished ? (
        <Link to={ROUTES.eventDetail(slug)} className={styles.join}>
          {t('moviePage.night.join')}
        </Link>
      ) : null}
      <MoreActions night={night} onRequestRemove={onRequestRemove} t={t} />
    </div>
  );
}

function NightIdentity({ night, t }: Readonly<{ night: Night; t: Translate }>) {
  const { event, movie } = night;
  if (!event) return null;
  const proposer = movie
    ? event.participants?.find((p) => p.id === getParticipantId(movie))
    : undefined;
  return (
    <div className={styles.identity}>
      <span className={styles.nightTitle}>{event.title}</span>
      {movie ? (
        <span className={styles.proposer}>
          <Avatar avatarId={proposer?.avatarId} pseudo={movie.proposerPseudo} size="xs" />
          {t('moviePage.night.proposedBy', { pseudo: movie.proposerPseudo })}
        </span>
      ) : null}
      {night.loaded && !movie ? (
        <span className={styles.proposer}>{t('moviePage.night.gone', { title: event.title })}</span>
      ) : null}
    </div>
  );
}

export default function MovieNightBar({
  slug,
  tmdbId,
  mediaType,
  onBack,
  onRemoved,
}: Readonly<MovieNightBarProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const night = useMovieNight({ slug, tmdbId, mediaType });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const title = night.event?.title ?? '';
  const actions = (
    <NightActions
      night={night}
      compact={isMobile}
      slug={slug}
      onRequestRemove={() => setConfirmRemove(true)}
      t={t}
    />
  );

  return (
    <>
      <section className={styles.bar} aria-label={t('moviePage.night.regionAria', { title })}>
        <div className={styles.inner}>
          <IconButton ariaLabel={t('moviePage.night.back', { title })} onClick={onBack}>
            <ArrowLeft aria-hidden size={ICON_SIZE.lg} />
          </IconButton>
          <NightIdentity night={night} t={t} />
          {isMobile ? null : actions}
        </div>
      </section>
      {isMobile && night.movie ? <div className={styles.dock}>{actions}</div> : null}
      {night.actionError ? (
        <div className={styles.error}>
          <EventActionErrorBanner message={night.actionError} onDismiss={night.clearActionError} />
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmRemove}
        title={t('movies.list.removeConfirmTitle')}
        message={pluralizeCount(
          (night.movie?.up ?? 0) + (night.movie?.down ?? 0),
          'movies.list.removeConfirmMessageOne',
          'movies.list.removeConfirmMessage',
          t,
          { title: night.movie?.title ?? '' }
        )}
        confirmLabel={t('movies.list.removeConfirmAction')}
        loading={night.removePending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          void night.remove().then((removed) => {
            setConfirmRemove(false);
            if (removed) onRemoved();
          });
        }}
      />
    </>
  );
}
