import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import clsx from 'clsx';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Disc3,
  ExternalLink,
  Info,
  ListPlus,
  MessageSquarePlus,
  MoreVertical,
  Quote,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { ROUTES } from '@/app/routes';
import Avatar from '@/shared/components/Avatar';
import Tooltip from '@/shared/components/Tooltip';
import MovieDetailsModal, {
  type MovieDetailsEventContext,
  type MovieDetailsTabKey,
} from '@/features/movies/components/MovieDetailsModal';
import { ModeIcon } from '@/features/movies/components/WatchProviderChips';
import {
  allocineUrl,
  imdbUrl,
  letterboxdUrl,
  tmdbPageUrl,
} from '@/features/movies/utils/movieExternalLinks';
import type { MovieData } from '@/shared/types/movie';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import {
  deleteMoviePitchNote,
  markMovieAsSeen,
  setMoviePitchNote,
  unmarkMovieAsSeen,
} from '@/features/movies/api/moviesApi';
import { othersAlreadySeenHint } from '@/features/movies/utils/seenHint';
import { getErrorMessage } from '@/shared/api/apiError';
import type { Translate } from '@/features/movies/types';
import type { RatingScale } from '@/shared/types/theme';
import styles from './movieCardParts.module.css';

export const PITCH_MAX = 140;
const NOTE_PREVIEW_THRESHOLD = 38;

export interface MovieCardSelection {
  active: boolean;
  pending?: boolean;
  onSelect: (movie: MovieData) => void;
}

export interface MovieWheelExclusion {
  excluded: boolean;
  onToggle: () => void;
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

interface CardKebabProps {
  title: string;
  year?: string;
  tmdbId: number;
  mediaType?: 'movie' | 'tv';
  isMine: boolean;
  isHost: boolean;
  canRemove: boolean;
  onRemove: () => void;
  inWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  onProposeToEvent?: () => void;
  onViewDetails?: () => void;
  showExternalLinks?: boolean;
  wheelExclusion?: MovieWheelExclusion;
  t: Translate;
}

export function CardKebabWhenAvailable({
  slotClassName,
  canRemove,
  onToggleWatchlist,
  onToggleWheelExclusion,
  ...kebabProps
}: Readonly<
  CardKebabProps & {
    slotClassName: string;
    onToggleWatchlist?: () => void;
    onToggleWheelExclusion?: () => void;
  }
>) {
  if (!canRemove && !onToggleWatchlist && !onToggleWheelExclusion && !kebabProps.onViewDetails)
    return null;
  return (
    <div className={slotClassName}>
      <CardKebab
        {...kebabProps}
        canRemove={canRemove}
        onToggleWatchlist={onToggleWatchlist}
        wheelExclusion={kebabProps.wheelExclusion}
      />
    </div>
  );
}

function deriveWheelToggle(
  movie: MovieData,
  onToggleWatchlist?: (movie: MovieData) => void,
  onToggleWheelExclusion?: (movie: MovieData) => void
) {
  const excluded = !!movie.excludedFromWheel;
  const toggleWatchlist = onToggleWatchlist ? () => onToggleWatchlist(movie) : undefined;
  const toggleExclusion = onToggleWheelExclusion ? () => onToggleWheelExclusion(movie) : undefined;
  return { excluded, toggleWatchlist, toggleExclusion };
}

export function MovieCardKebab({
  movie,
  card,
  slotClassName,
  isHost,
  isInWatchlist,
  onRemove,
  onToggleWatchlist,
  onToggleWheelExclusion,
  t,
}: Readonly<{
  movie: MovieData;
  card: {
    isMine: boolean;
    canRemove: boolean;
    hasDetails: boolean;
    openDetails: (tab?: MovieDetailsTabKey) => void;
  };
  slotClassName: string;
  isHost: boolean;
  isInWatchlist?: boolean;
  onRemove: (movie: MovieData) => void;
  onToggleWatchlist?: (movie: MovieData) => void;
  onToggleWheelExclusion?: (movie: MovieData) => void;
  t: Translate;
}>) {
  const { excluded, toggleWatchlist, toggleExclusion } = deriveWheelToggle(
    movie,
    onToggleWatchlist,
    onToggleWheelExclusion
  );
  return (
    <CardKebabWhenAvailable
      slotClassName={slotClassName}
      title={movie.title}
      year={movie.year}
      tmdbId={movie.tmdbId}
      mediaType={movie.mediaType}
      showExternalLinks={false}
      isMine={card.isMine}
      isHost={isHost}
      canRemove={card.canRemove}
      onRemove={() => onRemove(movie)}
      inWatchlist={isInWatchlist}
      onToggleWatchlist={toggleWatchlist}
      onToggleWheelExclusion={toggleExclusion}
      onViewDetails={card.hasDetails ? () => card.openDetails('soiree') : undefined}
      wheelExclusion={toggleExclusion ? { excluded, onToggle: toggleExclusion } : undefined}
      t={t}
    />
  );
}

const DESCENDER_CHARS = /[gjpqy]/;
const KEBAB_MENU_VIEWPORT_MARGIN = 8;

function kebabLabelClassName(label: string): string | undefined {
  return DESCENDER_CHARS.test(label)
    ? styles.kebabItemLabel
    : clsx(styles.kebabItemLabel, styles.kebabItemLabelCaps);
}

function ExternalMenuLink({
  href,
  label,
  onClose,
}: Readonly<{
  href: string;
  label: string;
  onClose: () => void;
}>) {
  return (
    <a
      role="menuitem"
      className={styles.kebabItem}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClose}
      aria-label={label}
    >
      <ExternalLink aria-hidden size={14} />
      <span className={kebabLabelClassName(label)}>{label}</span>
    </a>
  );
}

export function CardKebab({
  title,
  year,
  tmdbId,
  mediaType,
  isMine,
  isHost,
  canRemove,
  onRemove,
  inWatchlist,
  onToggleWatchlist,
  onProposeToEvent,
  onViewDetails,
  showExternalLinks = true,
  wheelExclusion,
  t,
}: Readonly<CardKebabProps>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number; ready: boolean }>({
    top: 0,
    right: 0,
    ready: false,
  });
  const close = useCallback(() => setOpen(false), []);

  const repositionMenu = useCallback(() => {
    if (!btnRef.current || !menuRef.current) return;
    const btnRect = btnRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - btnRect.bottom;
    const top =
      spaceBelow >= menuRect.height + KEBAB_MENU_VIEWPORT_MARGIN
        ? btnRect.bottom + 4
        : Math.max(KEBAB_MENU_VIEWPORT_MARGIN, btnRect.top - menuRect.height - 4);
    const right = Math.min(
      Math.max(window.innerWidth - btnRect.right, KEBAB_MENU_VIEWPORT_MARGIN),
      window.innerWidth - menuRect.width - KEBAB_MENU_VIEWPORT_MARGIN
    );
    setMenuPos({ top, right, ready: true });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    repositionMenu();
  }, [open, repositionMenu]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', repositionMenu, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', repositionMenu, true);
    };
  }, [open, close, repositionMenu]);

  useEffect(() => {
    if (!open || !menuPos.ready) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [open, menuPos.ready]);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowDown') nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    else if (e.key === 'ArrowUp')
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = items.length - 1;
    items[nextIndex]?.focus();
  };

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right, ready: false });
    }
    setOpen((v) => !v);
  };

  const removeAria = isMine
    ? `${t('movies.list.removeButton')} ${title}`
    : t('movies.list.removeAsHostAria', { title });

  const lbUrl = letterboxdUrl(tmdbId, mediaType, title);
  const imdbHref = imdbUrl(title, year);
  const allocineHref = allocineUrl(title);
  const tmdbHref = tmdbPageUrl(tmdbId, mediaType);

  const hasPrimaryGroup =
    !!onToggleWatchlist || !!onProposeToEvent || !!onViewDetails || !!wheelExclusion;
  const hasLinksGroup = showExternalLinks && tmdbId > 0;

  const watchlistLabel = inWatchlist
    ? t('watchlist.card.removeAction')
    : t('watchlist.card.addAction');
  const proposeLabel = t('watchlist.card.proposeAction');
  const detailsLabel = t('watchlist.card.detailsAction');
  const wheelLabel = wheelExclusion?.excluded
    ? t('movies.list.includeInWheelAction')
    : t('movies.list.excludeFromWheelAction');
  const removeLabel = t('movies.list.removeButton');

  return (
    <div className={styles.kebab} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className={styles.kebabBtn}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('movies.list.moreActionsAria', { title })}
      >
        <MoreVertical aria-hidden size={18} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.kebabMenu}
            role="menu"
            onKeyDown={handleMenuKeyDown}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              right: `${menuPos.right}px`,
              zIndex: 9999,
              visibility: menuPos.ready ? 'visible' : 'hidden',
            }}
          >
            {onToggleWatchlist && (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabItem}
                onClick={() => {
                  setOpen(false);
                  onToggleWatchlist();
                }}
              >
                {inWatchlist ? (
                  <BookmarkCheck aria-hidden size={14} />
                ) : (
                  <Bookmark aria-hidden size={14} />
                )}
                <span className={kebabLabelClassName(watchlistLabel)}>{watchlistLabel}</span>
              </button>
            )}
            {onProposeToEvent && (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabItem}
                onClick={() => {
                  setOpen(false);
                  onProposeToEvent();
                }}
              >
                <ListPlus aria-hidden size={14} />
                <span className={kebabLabelClassName(proposeLabel)}>{proposeLabel}</span>
              </button>
            )}
            {onViewDetails && (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabItem}
                onClick={() => {
                  setOpen(false);
                  onViewDetails();
                }}
              >
                <Info aria-hidden size={14} />
                <span className={kebabLabelClassName(detailsLabel)}>{detailsLabel}</span>
              </button>
            )}
            {wheelExclusion && (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabItem}
                onClick={() => {
                  setOpen(false);
                  wheelExclusion.onToggle();
                }}
              >
                {wheelExclusion.excluded ? (
                  <RotateCcw aria-hidden size={14} />
                ) : (
                  <Disc3 aria-hidden size={14} />
                )}
                <span className={kebabLabelClassName(wheelLabel)}>{wheelLabel}</span>
              </button>
            )}
            {hasPrimaryGroup && hasLinksGroup && <hr className={styles.kebabDivider} />}
            {hasLinksGroup && (
              <>
                <ExternalMenuLink
                  href={lbUrl}
                  label={t('movies.list.letterboxdButton')}
                  onClose={close}
                />
                <ExternalMenuLink
                  href={imdbHref}
                  label={t('movies.list.imdbButton')}
                  onClose={close}
                />
                <ExternalMenuLink
                  href={allocineHref}
                  label={t('movies.list.allocineButton')}
                  onClose={close}
                />
                <ExternalMenuLink
                  href={tmdbHref}
                  label={t('movies.list.tmdbButton')}
                  onClose={close}
                />
              </>
            )}
            {canRemove && (hasPrimaryGroup || hasLinksGroup) && (
              <hr className={styles.kebabDivider} />
            )}
            {canRemove && (
              <button
                type="button"
                role="menuitem"
                className={clsx(styles.kebabItem, styles.kebabItemDanger)}
                onClick={() => {
                  setOpen(false);
                  onRemove();
                }}
                aria-label={removeAria}
                title={!isMine && isHost ? t('movies.list.removeAsHostTitle') : undefined}
              >
                <Trash2 aria-hidden size={14} />
                <span className={kebabLabelClassName(removeLabel)}>{removeLabel}</span>
              </button>
            )}
          </div>,
          document.body
        )}
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
          <MessageSquarePlus aria-hidden size={15} />
        </button>
      )}
    </span>
  );
}

interface MovieNoteProps {
  movieId: string;
  slug: string;
  pitchNote?: string | null;
  isMine: boolean;
  participantId: string | null;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  refresh: () => void;
  onActionError: (message: string) => void;
  t: Translate;
}

export function MovieNote({
  movieId,
  slug,
  pitchNote,
  isMine,
  participantId,
  editing,
  onEditingChange,
  refresh,
  onActionError,
  t,
}: Readonly<MovieNoteProps>) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(pitchNote ?? '');
      textareaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleSave = async () => {
    if (!participantId || pending) return;
    const trimmed = draft.trim();
    if (trimmed.length > PITCH_MAX) return;
    if (!trimmed && pitchNote == null) {
      onEditingChange(false);
      return;
    }
    setPending(true);
    try {
      if (trimmed) {
        await setMoviePitchNote(slug, movieId, participantId, trimmed);
      } else {
        await deleteMoviePitchNote(slug, movieId, participantId);
      }
      onEditingChange(false);
      refresh();
    } catch {
      onActionError(t('movies.pitchNote.saveError'));
    } finally {
      setPending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleSave();
    if (e.key === 'Escape') onEditingChange(false);
  };

  if (editing) {
    const over = draft.trim().length > PITCH_MAX;
    return (
      <div className={styles.noteEditor}>
        <textarea
          ref={textareaRef}
          className={styles.noteTextarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={t('movies.pitchNote.placeholder')}
          disabled={pending}
        />
        <div className={styles.noteEditorFooter}>
          <span className={clsx(styles.noteCharCount, over && styles.noteCharCountOver)}>
            {t('movies.pitchNote.charCount', { count: draft.trim().length })}
          </span>
          <div className={styles.noteEditorActions}>
            <button
              type="button"
              className={clsx(styles.noteBtn, styles.noteBtnGhost)}
              onClick={() => onEditingChange(false)}
              disabled={pending}
            >
              <X aria-hidden size={13} />
              <span className={styles.noteBtnLabel}>{t('movies.pitchNote.cancelButton')}</span>
            </button>
            <button
              type="button"
              className={clsx(styles.noteBtn, styles.noteBtnPrimary)}
              onClick={() => void handleSave()}
              disabled={pending || over}
            >
              <Check aria-hidden size={13} />
              <span className={styles.noteBtnLabel}>{t('movies.pitchNote.saveButton')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pitchNote) return null;

  const textNode = (
    <span className={clsx(styles.noteText, !expanded && styles.noteTextClamp)}>{pitchNote}</span>
  );

  if (isMine) {
    return (
      <div className={styles.note}>
        <Quote aria-hidden size={13} className={styles.noteQuote} />
        <button
          type="button"
          className={styles.noteEditTrigger}
          onClick={() => onEditingChange(true)}
        >
          {textNode}
        </button>
      </div>
    );
  }

  const showExpand = pitchNote.length > NOTE_PREVIEW_THRESHOLD;
  return (
    <div className={styles.note}>
      <Quote aria-hidden size={13} className={styles.noteQuote} />
      {textNode}
      {showExpand && (
        <button
          type="button"
          className={styles.noteExpand}
          aria-expanded={expanded}
          aria-label={expanded ? t('movies.details.toggleHide') : t('movies.details.toggleShow')}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp aria-hidden size={14} /> : <ChevronDown aria-hidden size={14} />}
        </button>
      )}
    </div>
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
