import { useCallback, useId, useState } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Bookmark, Info, MessageSquarePlus, ThumbsDown, ThumbsUp } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import Avatar from '@/shared/components/Avatar';
import Tooltip from '@/shared/components/Tooltip';
import MovieDetailsModal, {
  type MovieDetailsEventContext,
  type MovieDetailsTabKey,
} from '@/features/movies/components/MovieDetailsModal';
import { ModeIcon } from '@/features/movies/components/WatchProviderChips';
import type { MovieData } from '@/shared/types/movie';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { markMovieAsSeen, unmarkMovieAsSeen } from '@/features/movies/api/moviesApi';
import { othersAlreadySeenHint } from '@/features/movies/utils/seenHint';
import { getErrorMessage } from '@/shared/api/apiError';
import type { Translate } from '@/features/movies/types';
import type { RatingScale } from '@/shared/types/theme';
import styles from './movieCardParts.module.css';

export { MovieNote, PITCH_MAX } from './MovieNote';
export { CardKebab, CardKebabWhenAvailable, MovieCardKebab } from './MovieCardKebab';
import { deriveWheelToggle } from './MovieCardKebab';
export type { MovieWheelExclusion } from '@/features/movies/types';

export interface MovieCardSelection {
  active: boolean;
  pending?: boolean;
  onSelect: (movie: MovieData) => void;
}

export interface MovieCardCommonProps {
  movie: MovieData;
  slug: string;
  participantId: string | null;
  participantPseudo: string | null;
  isFinished: boolean;
  isHost: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movie: MovieData) => void;
  refresh: () => void;
  onActionError: (message: string) => void;
  t: Translate;
  participantAvatars?: Record<string, string>;
  participantAvatarsByPseudo?: Record<string, string>;
  ratingScale?: RatingScale;
  eager?: boolean;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (movie: MovieData) => void;
  onToggleWheelExclusion?: (movie: MovieData) => void;
  selection?: MovieCardSelection;
  isWinner?: boolean;
  isMobile?: boolean;
  participantCount?: number;
}

export function CardSelectionOverlay({
  movie,
  selection,
  t,
}: Readonly<{ movie: MovieData; selection: MovieCardSelection; t: Translate }>) {
  return (
    <button
      type="button"
      className={styles.selectOverlay}
      onClick={() => selection.onSelect(movie)}
      disabled={selection.pending}
      aria-label={t('events.wheel.manualPickCardAria', { title: movie.title })}
      data-testid={`manual-pick-${movie.id}`}
    />
  );
}

export function useMovieCardState({
  movie: m,
  slug,
  participantId,
  participantPseudo,
  isFinished,
  isHost,
  participantAvatars,
  ratingScale,
  refresh,
  onActionError,
  t,
}: Readonly<{
  movie: MovieData;
  slug: string;
  participantId: string | null;
  participantPseudo: string | null;
  isFinished: boolean;
  isHost: boolean;
  participantAvatars?: Record<string, string>;
  ratingScale?: RatingScale;
  refresh: () => void;
  onActionError: (message: string) => void;
  t: Translate;
}>) {
  const isMine = !!participantId && getParticipantId(m) === participantId;
  const proposerAvatarId = participantAvatars?.[getParticipantId(m)] ?? '';
  const canRemove = !isFinished && (isMine || isHost);
  const canAct = !isFinished && !!participantId;
  const iMarkedSeen = !!(participantPseudo && m.seenByPseudos?.includes(participantPseudo));
  const others = (m.seenByPseudos ?? []).filter((p) => p !== participantPseudo);
  const othersHint = othersAlreadySeenHint(m.seenByPseudos, participantPseudo, t);
  const voteLabel = formatTmdbVote(m.voteAverage, ratingScale);
  const runtimeLabel = formatRuntimeMinutes(m.runtimeMinutes);
  const posterSrc = posterImageSrc(m.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const providers = m.watchProviders ?? [];

  const [seenPending, setSeenPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsInitialTab, setDetailsInitialTab] = useState<MovieDetailsTabKey>('soiree');
  const [noteEditing, setNoteEditing] = useState(false);
  const detailsPanelId = useId();
  const hasDetails = m.tmdbId > 0;
  const showAddNote = canAct && isMine && !m.pitchNote && !noteEditing;

  const openDetails = useCallback(
    (tab: MovieDetailsTabKey = 'soiree') => {
      if (!hasDetails) return;
      setDetailsInitialTab(tab);
      setDetailsOpen(true);
    },
    [hasDetails]
  );

  const handleToggleSeen = async () => {
    if (!participantId || seenPending) return;
    setSeenPending(true);
    try {
      if (iMarkedSeen) {
        await unmarkMovieAsSeen(slug, m.id, participantId);
      } else {
        await markMovieAsSeen(slug, m.id, participantId);
      }
      refresh();
    } catch (e) {
      onActionError(getErrorMessage(e, t('movies.seen.actionError')));
    } finally {
      setSeenPending(false);
    }
  };

  return {
    isMine,
    proposerAvatarId,
    canRemove,
    canAct,
    iMarkedSeen,
    others,
    othersHint,
    voteLabel,
    runtimeLabel,
    posterSrc,
    posterSrcSet,
    providers,
    seenPending,
    detailsOpen,
    setDetailsOpen,
    detailsInitialTab,
    openDetails,
    detailsPanelId,
    hasDetails,
    noteEditing,
    setNoteEditing,
    showAddNote,
    handleToggleSeen,
  };
}

export function VoteBar({
  m,
  onVote,
  t,
}: Readonly<{
  m: MovieData;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  t: Translate;
}>) {
  return (
    <div
      className={styles.votes}
      role="toolbar"
      aria-label={t('movies.list.voteToolbarAria', { title: m.title })}
    >
      <button
        type="button"
        className={clsx(styles.voteBtn, m.myVote === 1 && styles.voteActive)}
        onClick={() => void onVote(m.id, 1)}
        aria-pressed={m.myVote === 1}
        aria-label={
          m.myVote === 1
            ? t('movies.list.voteUpRemoveAria', { title: m.title })
            : `${t('movies.list.voteUp')} ${m.title}`
        }
      >
        <ThumbsUp aria-hidden size={16} />
        <span className={styles.voteCount}>{m.up}</span>
      </button>
      <button
        type="button"
        className={clsx(styles.voteBtn, m.myVote === -1 && styles.voteActive)}
        onClick={() => void onVote(m.id, -1)}
        aria-pressed={m.myVote === -1}
        aria-label={
          m.myVote === -1
            ? t('movies.list.voteDownRemoveAria', { title: m.title })
            : `${t('movies.list.voteDown')} ${m.title}`
        }
      >
        <ThumbsDown aria-hidden size={16} />
        <span className={styles.voteCount}>{m.down}</span>
      </button>
    </div>
  );
}

export function PaidOfferChip({
  type,
  count,
  onClick,
  ariaLabel,
}: Readonly<{
  type: 'rent' | 'buy';
  count: number;
  onClick: () => void;
  ariaLabel: string;
}>) {
  return (
    <button type="button" className={styles.paidChip} onClick={onClick} aria-label={ariaLabel}>
      <ModeIcon type={type} size={13} />
      <span className={styles.paidChipCount}>{count}</span>
    </button>
  );
}

export function ProposerBadge({
  avatarId,
  pseudo,
  handle,
  t,
}: Readonly<{
  avatarId: string;
  pseudo: string;
  handle?: string | null;
  t: Translate;
}>) {
  const content = (
    <>
      <Avatar avatarId={avatarId} pseudo={pseudo} size="xs" />
      <span className={styles.proposerName}>{pseudo}</span>
    </>
  );
  if (!handle) {
    return <span className={styles.proposer}>{content}</span>;
  }
  return (
    <Tooltip label={pseudo}>
      <Link
        to={ROUTES.profile(handle)}
        className={clsx(styles.proposer, styles.proposerLink)}
        aria-label={t('movies.details.viewProposerProfileAria', { pseudo })}
      >
        {content}
      </Link>
    </Tooltip>
  );
}

export function CardProposerFooter({
  s,
  m,
  t,
}: Readonly<{
  s: ReturnType<typeof useMovieCardState>;
  m: MovieData;
  t: Translate;
}>) {
  return (
    <span className={styles.proposerGroup}>
      <ProposerBadge
        avatarId={s.proposerAvatarId}
        pseudo={m.proposerPseudo}
        handle={m.proposerHandle}
        t={t}
      />
      {s.showAddNote && (
        <button
          type="button"
          className={styles.addNote}
          onClick={() => s.setNoteEditing(true)}
          aria-label={t('movies.pitchNote.addButton')}
          title={t('movies.pitchNote.addButton')}
        >
          <MessageSquarePlus aria-hidden size={15} />
        </button>
      )}
    </span>
  );
}

export function DetailsInfoButton({
  hasDetails,
  onOpen,
  title,
  className,
  t,
}: Readonly<{
  hasDetails: boolean;
  onOpen: () => void;
  title: string;
  className?: string;
  t: Translate;
}>) {
  if (!hasDetails) return null;
  return (
    <button
      type="button"
      className={clsx(styles.infoBtn, className)}
      onClick={onOpen}
      aria-label={t('watchlist.card.openDetailsAria', { title })}
    >
      <Info aria-hidden size={14} />
    </button>
  );
}

export function OverflowChip({
  count,
  onClick,
  ariaLabel,
}: Readonly<{ count: number; onClick: () => void; ariaLabel: string }>) {
  return (
    <button type="button" className={styles.paidChip} onClick={onClick} aria-label={ariaLabel}>
      <span className={styles.paidChipCount}>+{count}</span>
    </button>
  );
}

export function WatchlistBadge({
  inWatchlist,
  t,
}: Readonly<{ inWatchlist?: boolean; t: Translate }>) {
  if (!inWatchlist) return null;
  return (
    <span
      className={styles.watchlistBadge}
      role="img"
      aria-label={t('watchlist.card.inWatchlistBadgeAria')}
    >
      <Bookmark aria-hidden size={11} fill="currentColor" />
    </span>
  );
}

export function CardModals({
  s,
  m,
  isHost,
  onVote,
  onRemove,
  isInWatchlist,
  onToggleWatchlist,
  onToggleWheelExclusion,
  avatarsByPseudo,
  participantCount,
}: Readonly<{
  s: ReturnType<typeof useMovieCardState>;
  m: MovieData;
  isHost: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movie: MovieData) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (movie: MovieData) => void;
  onToggleWheelExclusion?: (movie: MovieData) => void;
  avatarsByPseudo?: Record<string, string>;
  participantCount?: number;
}>) {
  const { excluded, toggleWatchlist, toggleExclusion } = deriveWheelToggle(
    m,
    onToggleWatchlist,
    onToggleWheelExclusion
  );

  const eventContext: MovieDetailsEventContext = {
    movie: m,
    canAct: s.canAct,
    participantCount,
    onVote: (value) => void onVote(m.id, value),
    iMarkedSeen: s.iMarkedSeen,
    seenPending: s.seenPending,
    onToggleSeen: () => void s.handleToggleSeen(),
    seenOthers: s.others,
    seenOthersHint: s.othersHint,
    avatarsByPseudo,
    proposerAvatarId: s.proposerAvatarId,
    isInWatchlist,
    onToggleWatchlist: toggleWatchlist,
    wheelExclusion: toggleExclusion ? { excluded, onToggle: toggleExclusion } : undefined,
    canRemove: s.canRemove,
    isMine: s.isMine,
    isHost,
    onRemove: () => {
      s.setDetailsOpen(false);
      onRemove(m);
    },
  };

  return (
    <>
      {s.hasDetails && (
        <MovieDetailsModal
          open={s.detailsOpen}
          title={m.title}
          year={m.year}
          tmdbId={m.tmdbId}
          mediaType={m.mediaType}
          posterSrc={s.posterSrc}
          voteLabel={s.voteLabel}
          runtimeLabel={s.runtimeLabel}
          watchProviders={s.providers}
          watchPageUrl={m.tmdbWatchPageUrl}
          initialTab={s.detailsInitialTab}
          eventContext={eventContext}
          onClose={() => s.setDetailsOpen(false)}
        />
      )}
    </>
  );
}
