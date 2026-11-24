import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import {
  AlertTriangle,
  MessageSquarePlus,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Trophy,
} from 'lucide-react';
import Button from '@/shared/components/Button';
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
import ScoreBar from '@/features/events/components/ScoreBar';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { useNightMovieActions } from '@/features/events/hooks/useNightMovieActions';
import type { NightMovieRules } from '@/features/events/lib/nightRules';
import type { CardKebabRemoveAction } from '@/features/movies/components/MovieCardKebab';
import { othersAlreadySeenHint } from '@/features/events/utils/seenHint';
import { MovieNote } from '@/features/events/components/MovieNote';
import type { AccentColor, RatingScale } from '@/shared/types/theme';
import { useLocale, type Translate } from '@/shared/i18n';
import { withElision } from '@/shared/i18n/withElision';
import styles from './eventMovieCardParts.module.css';
import { useParticipantAccent } from '@/features/events/hooks/useParticipantAccent';

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
  if (rules.isMine)
    return { label, ariaLabel: `${label} ${movie.title}`, opensDialog: true, onSelect };
  return {
    label,
    ariaLabel: t('movies.list.removeAsHostAria', { title: movie.title }),
    title: t('movies.list.removeAsHostTitle'),
    opensDialog: true,
    onSelect,
  };
}

export function noteRemoveAction(
  m: MovieData,
  canRemove: boolean,
  onRemoveNote: ((movie: MovieData) => void) | undefined,
  t: Translate
): CardKebabRemoveAction | undefined {
  if (!m.pitchNote || !canRemove || !onRemoveNote) return undefined;
  return {
    label: t('movies.pitchNote.removeAction'),
    ariaLabel: t('movies.pitchNote.removeAria', { title: m.title }),
    opensDialog: true,
    onSelect: () => onRemoveNote(m),
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
  const proposerAccent = useParticipantAccent(getParticipantId(m));
  const votingAvailable = canVote ?? actions.canAct;
  const others = (m.seenByPseudos ?? []).filter((p) => p !== participantPseudo);
  const othersHint = othersAlreadySeenHint(m.seenByPseudos, participantPseudo, t);
  const voteValue = formatTmdbVote(m.voteAverage, ratingScale, locale, false);
  const runtimeLabel = formatRuntimeMinutes(m.runtimeMinutes);
  const posterSrc = posterImageSrc(m.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);

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
    proposerAccent,
    canRemove: actions.canRemove,
    canAct: actions.canAct,
    canEditNote: actions.canEditNote,
    canVote: votingAvailable,
    iMarkedSeen: actions.iMarkedSeen,
    others,
    othersHint,
    voteValue,
    runtimeLabel,
    ratingScale,
    posterSrc,
    posterSrcSet,
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

export interface MovieVoteError {
  message: string;
  onRetry: () => void;
}

export function VoteBar({
  m,
  onVote,
  t,
  lockedHint,
  framed = false,
  showLabels = false,
}: Readonly<{
  m: MovieData;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  t: Translate;
  lockedHint?: string;
  framed?: boolean;
  showLabels?: boolean;
}>) {
  const locked = !!lockedHint;
  const voteButton = (value: 1 | -1) => {
    const up = value === 1;
    const active = m.myVote === value;
    const Icon = up ? ThumbsUp : ThumbsDown;
    let ariaLabel = `${t(up ? 'movies.list.voteUp' : 'movies.list.voteDown')} ${m.title}`;
    if (active) {
      ariaLabel = t(up ? 'movies.list.voteUpRemoveAria' : 'movies.list.voteDownRemoveAria', {
        title: m.title,
      });
    }
    const content = (
      <>
        <Icon aria-hidden size={ICON_SIZE.md} />
        {showLabels ? (
          <span>{t(up ? 'movies.card.voteUpLabel' : 'movies.card.voteDownLabel')}</span>
        ) : null}
        <span className={styles.voteCount}>{up ? m.up : m.down}</span>
      </>
    );
    const shared = {
      onClick: () => void onVote(m.id, value),
      disabled: locked,
      'aria-pressed': active,
      'aria-label': ariaLabel,
    };
    if (framed) {
      return (
        <Button
          variant={active ? 'primary' : 'secondary'}
          size="sm"
          className={styles.voteBtnFramed}
          {...shared}
        >
          {content}
        </Button>
      );
    }
    return (
      <button
        type="button"
        className={clsx(styles.voteBtn, active && styles.voteActive)}
        {...shared}
      >
        {content}
      </button>
    );
  };
  return (
    <div
      className={clsx(styles.votes, framed && styles.votesFramed, locked && styles.votesLocked)}
      role="toolbar"
      aria-label={t('movies.list.voteToolbarAria', { title: m.title })}
      title={lockedHint}
    >
      {voteButton(1)}
      {voteButton(-1)}
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

export function VoteCounts({ m, t }: Readonly<{ m: MovieData; t: Translate }>) {
  return (
    <span
      className={styles.voteCounts}
      role="img"
      aria-label={t('movies.list.voteBreakdownAria', { up: m.up, down: m.down })}
    >
      <ThumbsUp aria-hidden size={ICON_SIZE.sm} />
      <span className={styles.voteCount}>{m.up}</span>
      <ThumbsDown aria-hidden size={ICON_SIZE.sm} />
      <span className={styles.voteCount}>{m.down}</span>
    </span>
  );
}

export function VoteErrorNotice({
  voteError,
  title,
  t,
  className,
}: Readonly<{ voteError: MovieVoteError; title: string; t: Translate; className?: string }>) {
  return (
    <div className={clsx(styles.voteError, className)}>
      <AlertTriangle aria-hidden size={ICON_SIZE.md} className={styles.voteErrorIcon} />
      <p className={styles.voteErrorMessage} role="alert">
        {voteError.message}
      </p>
      <Button
        variant="secondary"
        tone="danger"
        size="sm"
        onClick={voteError.onRetry}
        aria-label={t('movies.list.retryVoteAria', { title })}
      >
        <RotateCcw aria-hidden size={ICON_SIZE.sm} />
        {t('movies.list.retryVoteAction')}
      </Button>
    </div>
  );
}

export function ProposerBadge({
  avatarId,
  pseudo,
  handle,
  accent,
  t,
}: Readonly<{
  avatarId: string;
  pseudo: string;
  handle?: string | null;
  accent?: AccentColor;
  t: Translate;
}>) {
  const content = (
    <>
      <Avatar avatarId={avatarId} pseudo={pseudo} size="xs" accent={accent} />
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
        aria-label={withElision(
          pseudo,
          'movies.details.viewProposerProfileAria',
          'movies.details.viewProposerProfileAriaElided',
          t
        )}
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
        accent={s.proposerAccent}
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
  lines = 1,
  t,
}: Readonly<{
  s: ReturnType<typeof useMovieCardState>;
  m: MovieData;
  slug: string;
  participantId: string | null;
  refresh: () => void;
  onActionError: (message: string) => void;
  lines?: 1 | 2;
  t: Translate;
}>) {
  if (!m.pitchNote && !s.noteEditing) return null;
  return (
    <MovieNote
      movieId={m.id}
      slug={slug}
      pitchNote={m.pitchNote}
      editable={s.canEditNote}
      participantId={participantId}
      editing={s.noteEditing}
      onEditingChange={s.setNoteEditing}
      refresh={refresh}
      onActionError={onActionError}
      lines={lines}
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
  t,
}: Readonly<{ isWinner?: boolean; winnerRank?: number; t: Translate }>) {
  if (!isWinner) return null;
  return (
    <span className={styles.winnerRibbon}>
      <Trophy aria-hidden size={ICON_SIZE.xs} />
      <span className={styles.winnerRibbonLabel}>{winnerBadgeLabel(t, winnerRank)}</span>
    </span>
  );
}

export function ScoreBlock({
  m,
  t,
  inline = false,
}: Readonly<{ m: MovieData; t: Translate; inline?: boolean }>) {
  const total = m.up + m.down;
  const upRatio = total > 0 ? (m.up / total) * 100 : 0;
  const downRatio = total > 0 ? (m.down / total) * 100 : 0;
  const breakdown = t('movies.list.voteBreakdownAria', { up: m.up, down: m.down });
  const scoreNode = (
    <span className={clsx(styles.scoreBlock, inline && styles.scoreBlockInline)}>
      <span
        className={clsx(
          styles.scoreValue,
          m.score > 0 && styles.scorePositive,
          m.score < 0 && styles.scoreNegative
        )}
      >
        {m.score > 0 ? `+${m.score}` : m.score}
      </span>
      <ScoreBar upRatio={upRatio} downRatio={downRatio} className={styles.scoreBar} />
    </span>
  );
  if (total === 0) return scoreNode;
  return (
    <Tooltip label={breakdown} placement="top">
      {scoreNode}
    </Tooltip>
  );
}
