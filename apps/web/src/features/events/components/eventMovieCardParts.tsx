import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { MessageSquarePlus, ThumbsDown, ThumbsUp, Trophy } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import Avatar from '@/shared/components/Avatar';
import Tooltip from '@/shared/components/Tooltip';
import StatusDot from '@/shared/components/StatusDot';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useOpenMoviePage } from '@/features/movies/hooks/useOpenMoviePage';
import type { MovieData } from '@/shared/types/movie';
import { toTitleSummary } from '@/shared/utils/titleSummary';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { useNightMovieActions } from '@/features/events/hooks/useNightMovieActions';
import type { NightMovieRules } from '@/features/events/lib/nightRules';
import type { CardKebabRemoveAction } from '@/features/movies/components/MovieCardKebab';
import { othersAlreadySeenHint } from '@/features/events/utils/seenHint';
import { MovieNote } from '@/features/events/components/MovieNote';
import type { RatingScale } from '@/shared/types/theme';
import { useLocale, type Translate } from '@/shared/i18n';
import styles from './eventMovieCardParts.module.css';

export interface MovieCardSelection {
  active: boolean;
  pending?: boolean;
  mode: 'pick' | 'remove';
  selectableIds?: string[];
  onSelect: (movie: MovieData) => void;
}

export function isSelectable(movie: MovieData, selection?: MovieCardSelection): boolean {
  if (!selection?.active) return false;
  return !selection.selectableIds || selection.selectableIds.includes(movie.id);
}

export interface MovieCardCommonProps {
  movie: MovieData;
  slug: string;
  participantId: string | null;
  canVote?: boolean;
  participantPseudo: string | null;
  isFinished: boolean;
  wheelLocked?: boolean;
  isHost: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movie: MovieData) => void;
  onRemoveNote?: (movie: MovieData) => void;
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
  winnerRank?: number;
  voteLockedHint?: string;
  isMobile?: boolean;
}

export function CardSelectionOverlay({
  movie,
  selection,
  t,
}: Readonly<{ movie: MovieData; selection: MovieCardSelection; t: Translate }>) {
  return (
    <button
      type="button"
      className={clsx(
        styles.selectOverlay,
        selection.mode === 'remove' && styles.selectOverlayRemove
      )}
      onClick={() => selection.onSelect(movie)}
      disabled={selection.pending}
      aria-label={t(
        selection.mode === 'remove'
          ? 'events.wheel.removeWinnerCardAria'
          : 'events.wheel.manualPickCardAria',
        { title: movie.title }
      )}
      data-testid={`${selection.mode === 'remove' ? 'remove-winner' : 'manual-pick'}-${movie.id}`}
    />
  );
}

export function nightRemoveAction(
  movie: Pick<MovieData, 'title'>,
  rules: Pick<NightMovieRules, 'isMine' | 'canRemove'>,
  onSelect: () => void,
  t: Translate
): CardKebabRemoveAction | undefined {
  if (!rules.canRemove) return undefined;
  const label = t('movies.list.removeButton');
  if (rules.isMine) return { label, ariaLabel: `${label} ${movie.title}`, onSelect };
  return {
    label,
    ariaLabel: t('movies.list.removeAsHostAria', { title: movie.title }),
    title: t('movies.list.removeAsHostTitle'),
    onSelect,
  };
}

export function useMovieCardState({
  movie: m,
  slug,
  participantId,
  canVote,
  participantPseudo,
  isFinished,
  wheelLocked = false,
  isHost,
  participantAvatars,
  ratingScale,
  refresh,
  onRemove,
  onActionError,
  t,
}: Readonly<{
  movie: MovieData;
  slug: string;
  participantId: string | null;
  canVote?: boolean;
  participantPseudo: string | null;
  isFinished: boolean;
  wheelLocked?: boolean;
  isHost: boolean;
  participantAvatars?: Record<string, string>;
  ratingScale?: RatingScale;
  refresh: () => void;
  onRemove: (movie: MovieData) => void;
  onActionError: (message: string) => void;
  t: Translate;
}>) {
  const { locale } = useLocale();
  const actions = useNightMovieActions({
    slug,
    movie: m,
    isFinished,
    isHost,
    wheelLocked,
    participantId,
    participantPseudo,
    refresh,
    onError: onActionError,
  });
  const proposerAvatarId = participantAvatars?.[getParticipantId(m)] ?? '';
  const votingAvailable = canVote ?? actions.canAct;
  const others = (m.seenByPseudos ?? []).filter((p) => p !== participantPseudo);
  const othersHint = othersAlreadySeenHint(m.seenByPseudos, participantPseudo, t);
  const voteLabel = formatTmdbVote(m.voteAverage, ratingScale, locale);
  const runtimeLabel = formatRuntimeMinutes(m.runtimeMinutes);
  const posterSrc = posterImageSrc(m.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const providers = m.watchProviders ?? [];

  const openMoviePage = useOpenMoviePage();
  const [noteEditing, setNoteEditing] = useState(false);
  const hasDetails = m.tmdbId > 0;
  const showAddNote = actions.canEditNote && !m.pitchNote && !noteEditing;

  const openDetails = useCallback(() => {
    if (!hasDetails) return;
    openMoviePage(toTitleSummary(m), slug);
  }, [hasDetails, openMoviePage, m, slug]);

  return {
    isMine: actions.isMine,
    proposerAvatarId,
    canRemove: actions.canRemove,
    canAct: actions.canAct,
    canEditNote: actions.canEditNote,
    canVote: votingAvailable,
    iMarkedSeen: actions.iMarkedSeen,
    others,
    othersHint,
    voteLabel,
    runtimeLabel,
    ratingScale,
    posterSrc,
    posterSrcSet,
    providers,
    seenPending: actions.seenPending,
    openDetails,
    hasDetails,
    noteEditing,
    setNoteEditing,
    showAddNote,
    handleToggleSeen: actions.toggleSeen,
    kebabRemove: nightRemoveAction(m, actions, () => onRemove(m), t),
  };
}

export function VoteBar({
  m,
  onVote,
  t,
  lockedHint,
}: Readonly<{
  m: MovieData;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  t: Translate;
  lockedHint?: string;
}>) {
  const locked = !!lockedHint;
  return (
    <div
      className={clsx(styles.votes, locked && styles.votesLocked)}
      role="toolbar"
      aria-label={t('movies.list.voteToolbarAria', { title: m.title })}
      title={lockedHint}
    >
      <button
        type="button"
        className={clsx(styles.voteBtn, m.myVote === 1 && styles.voteActive)}
        onClick={() => void onVote(m.id, 1)}
        disabled={locked}
        aria-pressed={m.myVote === 1}
        aria-label={
          m.myVote === 1
            ? t('movies.list.voteUpRemoveAria', { title: m.title })
            : `${t('movies.list.voteUp')} ${m.title}`
        }
      >
        <ThumbsUp aria-hidden size={ICON_SIZE.md} />
        <span className={styles.voteCount}>{m.up}</span>
      </button>
      <button
        type="button"
        className={clsx(styles.voteBtn, m.myVote === -1 && styles.voteActive)}
        onClick={() => void onVote(m.id, -1)}
        disabled={locked}
        aria-pressed={m.myVote === -1}
        aria-label={
          m.myVote === -1
            ? t('movies.list.voteDownRemoveAria', { title: m.title })
            : `${t('movies.list.voteDown')} ${m.title}`
        }
      >
        <ThumbsDown aria-hidden size={ICON_SIZE.md} />
        <span className={styles.voteCount}>{m.down}</span>
      </button>
      {m.pendingVote ? (
        <span
          className={styles.votePending}
          role="img"
          aria-label={t('movies.list.votePendingAria')}
          title={t('movies.list.votePendingAria')}
        >
          <StatusDot pulsing />
        </span>
      ) : null}
    </div>
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
          <MessageSquarePlus aria-hidden size={ICON_SIZE.md} />
        </button>
      )}
    </span>
  );
}

export function CardNote({
  s,
  m,
  slug,
  participantId,
  refresh,
  onActionError,
  onRemoveNote,
  t,
}: Readonly<{
  s: ReturnType<typeof useMovieCardState>;
  m: MovieData;
  slug: string;
  participantId: string | null;
  refresh: () => void;
  onActionError: (message: string) => void;
  onRemoveNote?: (movie: MovieData) => void;
  t: Translate;
}>) {
  if (!m.pitchNote && !s.noteEditing) return null;
  return (
    <MovieNote
      movieId={m.id}
      movieTitle={m.title}
      slug={slug}
      pitchNote={m.pitchNote}
      editable={s.canEditNote}
      participantId={participantId}
      editing={s.noteEditing}
      onEditingChange={s.setNoteEditing}
      refresh={refresh}
      onActionError={onActionError}
      onRemove={s.canRemove && onRemoveNote ? () => onRemoveNote(m) : undefined}
      t={t}
    />
  );
}

export function PosterDetailsTrigger({
  hasDetails,
  onOpen,
  title,
  t,
}: Readonly<{
  hasDetails: boolean;
  onOpen: () => void;
  title: string;
  t: Translate;
}>) {
  if (!hasDetails) return null;
  return (
    <button
      type="button"
      className={styles.posterTrigger}
      onClick={onOpen}
      aria-label={t('movies.card.openDetailsAria', { title })}
      data-testid="poster-details-trigger"
    />
  );
}

export function winnerBadgeLabel(t: Translate, winnerRank?: number): string {
  return winnerRank
    ? t('events.wheel.winnerRankLabel', { rank: winnerRank })
    : t('events.wheel.winnerLabel');
}

export function WinnerRibbon({
  isWinner,
  winnerRank,
  compact = false,
  t,
}: Readonly<{ isWinner?: boolean; winnerRank?: number; compact?: boolean; t: Translate }>) {
  if (!isWinner) return null;
  const label = winnerBadgeLabel(t, winnerRank);
  if (compact) {
    return (
      <span className={styles.winnerRibbon} role="img" aria-label={label}>
        <Trophy aria-hidden size={ICON_SIZE.xs} />
        {winnerRank ? <span className={styles.winnerRibbonLabel}>{winnerRank}</span> : null}
      </span>
    );
  }
  return (
    <span className={styles.winnerRibbon}>
      <Trophy aria-hidden size={ICON_SIZE.xs} />
      <span className={styles.winnerRibbonLabel}>{label}</span>
    </span>
  );
}
