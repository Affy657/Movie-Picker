import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  MoreVertical,
  Quote,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Tooltip from '@/shared/components/Tooltip';
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
import type { TranslationKey } from '@/shared/i18n';
import styles from './movieCardParts.module.css';

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export const PITCH_MAX = 140;
const NOTE_PREVIEW_THRESHOLD = 38;

export interface MovieCardCommonProps {
  movie: MovieData;
  slug: string;
  participantId: string | null;
  participantPseudo: string | null;
  isFinished: boolean;
  isHost: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movieId: string) => Promise<void>;
  refresh: () => void;
  onActionError: (message: string) => void;
  t: Translate;
  participantAvatars?: Record<string, string>;
  participantAvatarsByPseudo?: Record<string, string>;
  eager?: boolean;
}

export function useMovieCardState({
  movie: m,
  slug,
  participantId,
  participantPseudo,
  isFinished,
  isHost,
  participantAvatars,
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
  const voteLabel = formatTmdbVote(m.voteAverage);
  const runtimeLabel = formatRuntimeMinutes(m.runtimeMinutes);
  const posterSrc = posterImageSrc(m.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const providers = m.watchProviders ?? [];

  const [seenPending, setSeenPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const detailsPanelId = useId();
  const hasDetails = m.tmdbId > 0;
  const showAddNote = canAct && isMine && !m.pitchNote && !noteEditing;

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
    providersOpen,
    setProvidersOpen,
    noteEditing,
    setNoteEditing,
    detailsPanelId,
    hasDetails,
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
    <div className={styles.votes} role="group" aria-label={m.title}>
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

export function SeenButton({
  m,
  iMarkedSeen,
  seenPending,
  onToggle,
  others,
  othersHint,
  avatarsByPseudo,
  t,
}: Readonly<{
  m: MovieData;
  iMarkedSeen: boolean;
  seenPending: boolean;
  onToggle: () => void;
  others: string[];
  othersHint: string | null;
  avatarsByPseudo?: Record<string, string>;
  t: Translate;
}>) {
  return (
    <span className={styles.seenWrap}>
      <button
        type="button"
        className={clsx(styles.seenBtn, iMarkedSeen && styles.seenActive)}
        onClick={onToggle}
        disabled={seenPending}
        aria-pressed={iMarkedSeen}
        aria-label={
          iMarkedSeen
            ? t('movies.seen.unmarkAria', { title: m.title })
            : t('movies.seen.markAria', { title: m.title })
        }
        title={t('movies.seen.neutralTooltip')}
      >
        <Eye aria-hidden size={15} />
        <span className={styles.seenLabel}>
          {m.seenCount
            ? t('movies.seen.labelWithCount', { count: m.seenCount })
            : t('movies.seen.label')}
        </span>
      </button>
      {othersHint && others.length > 0 && (
        <Tooltip label={othersHint}>
          <span className={styles.seenAvatars} role="img" aria-label={othersHint}>
            {others.slice(0, 3).map((pseudo) => (
              <Avatar
                key={pseudo}
                avatarId={avatarsByPseudo?.[pseudo] ?? ''}
                size="xs"
                className={styles.seenAvatar}
              />
            ))}
          </span>
        </Tooltip>
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
              {t('movies.pitchNote.cancelButton')}
            </button>
            <button
              type="button"
              className={clsx(styles.noteBtn, styles.noteBtnPrimary)}
              onClick={() => void handleSave()}
              disabled={pending || over}
            >
              <Check aria-hidden size={13} />
              {t('movies.pitchNote.saveButton')}
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

interface CardKebabProps {
  title: string;
  year?: string;
  tmdbId: number;
  mediaType?: 'movie' | 'tv';
  isMine: boolean;
  isHost: boolean;
  canRemove: boolean;
  onRemove: () => void;
  t: Translate;
}

function letterboxdUrl(tmdbId: number, mediaType?: 'movie' | 'tv', title?: string): string {
  if (mediaType === 'tv') {
    return `https://letterboxd.com/search/films/${encodeURIComponent(title ?? '')}/`;
  }
  return `https://letterboxd.com/tmdb/${tmdbId}/`;
}

function imdbUrl(title: string, year?: string): string {
  const q = year ? `${title} ${year}` : title;
  return `https://www.imdb.com/find/?q=${encodeURIComponent(q)}&s=tt`;
}

function allocineUrl(title: string): string {
  return `https://www.allocine.fr/recherche/?q=${encodeURIComponent(title)}`;
}

function tmdbPageUrl(tmdbId: number, mediaType?: 'movie' | 'tv'): string {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  return `https://www.themoviedb.org/${type}/${tmdbId}`;
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
      <span>{label}</span>
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
  t,
}: Readonly<CardKebabProps>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
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
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              right: `${menuPos.right}px`,
              zIndex: 9999,
            }}
          >
            {tmdbId > 0 && (
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
                <span>{t('movies.list.removeButton')}</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
