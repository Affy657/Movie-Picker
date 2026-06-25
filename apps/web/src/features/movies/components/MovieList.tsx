import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Film,
  MessageSquarePlus,
  MoreVertical,
  Quote,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import EmptyState from '@/shared/components/EmptyState';
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
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { MovieDetailsContent } from '@/features/movies/components/MovieDetailsPanel';
import { ModeIcon, TYPE_ORDER } from '@/features/movies/components/WatchProviderChips';
import WatchProvidersModal from '@/features/movies/components/WatchProvidersModal';
import TmdbAttribution from '@/features/movies/components/TmdbAttribution';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import styles from './MovieList.module.css';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

const PITCH_MAX = 140;
const NOTE_PREVIEW_THRESHOLD = 38;
const KNOWN_PROVIDER_TYPES = new Set<string>(TYPE_ORDER);

interface MovieListProps {
  movies: MovieData[];
  slug: string;
  participantId: string | null;
  participantPseudo: string | null;
  isFinished: boolean;
  isHost?: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movieId: string) => Promise<void>;
  refresh: () => void;
  onActionError: (message: string) => void;
  participantAvatars?: Record<string, string>;
  participantAvatarsByPseudo?: Record<string, string>;
  viewMode?: 'grid' | 'list';
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

function MovieNote({
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
          maxLength={PITCH_MAX}
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

function VoteBar({
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

function SeenButton({
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


interface MovieCardProps {
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
  viewMode?: 'grid' | 'list';
}

export const MovieCard = memo(function MovieCard({
  movie: m,
  slug,
  participantId,
  participantPseudo,
  isFinished,
  isHost,
  onVote,
  onRemove,
  refresh,
  onActionError,
  t,
  participantAvatars,
  participantAvatarsByPseudo,
  eager = false,
  viewMode = 'grid',
}: MovieCardProps) {
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
  const providerGroups = [
    ...TYPE_ORDER.map((type) => ({
      type,
      count: providers.filter((p) => p.type === type).length,
    })).filter((g) => g.count > 0),
    { type: 'other', count: providers.filter((p) => !KNOWN_PROVIDER_TYPES.has(p.type)).length },
  ].filter((g) => g.count > 0);

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

  const panelContent = (
    <>
      <div className={styles.titleBlock}>
        <h3 className={styles.title}>{m.title}</h3>
        <p className={styles.meta}>
          {m.year ? <span>{m.year}</span> : null}
          {runtimeLabel ? (
            <span title={t('movies.list.runtimeTitle')}>{runtimeLabel}</span>
          ) : null}
          {voteLabel ? (
            <span title={t('movies.list.tmdbVoteTitle')}>{voteLabel}</span>
          ) : null}
          {providerGroups.length > 0 && (
            <span>
              <button
                type="button"
                className={styles.metaProviders}
                onClick={() => setProvidersOpen(true)}
                aria-label={t('movies.watchProviders.openModalAria', { title: m.title })}
              >
                {providerGroups.map((g) => (
                  <span key={g.type} className={styles.metaProvGroup}>
                    <ModeIcon type={g.type} size={11} />
                    <span>{g.count}</span>
                  </span>
                ))}
              </button>
            </span>
          )}
        </p>
      </div>

      {canAct && (
        <div className={styles.actionRow}>
          <VoteBar m={m} onVote={onVote} t={t} />
          <SeenButton
            m={m}
            iMarkedSeen={iMarkedSeen}
            seenPending={seenPending}
            onToggle={() => void handleToggleSeen()}
            others={others}
            othersHint={othersHint}
            avatarsByPseudo={participantAvatarsByPseudo}
            t={t}
          />
        </div>
      )}

      {!canAct && othersHint && <p className={styles.seenHintText}>{othersHint}</p>}

      {(m.pitchNote || noteEditing) && (
        <MovieNote
          movieId={m.id}
          slug={slug}
          pitchNote={m.pitchNote}
          isMine={isMine}
          participantId={participantId}
          editing={noteEditing}
          onEditingChange={setNoteEditing}
          refresh={refresh}
          onActionError={onActionError}
          t={t}
        />
      )}

      <div className={styles.footRow}>
        <span className={styles.proposer}>
          <Avatar avatarId={proposerAvatarId} size="xs" />
          <span className={styles.proposerName}>{m.proposerPseudo}</span>
          {showAddNote && (
            <button
              type="button"
              className={styles.addNote}
              onClick={() => setNoteEditing(true)}
              aria-label={t('movies.pitchNote.addButton')}
              title={t('movies.pitchNote.addButton')}
            >
              <MessageSquarePlus aria-hidden size={15} />
            </button>
          )}
        </span>
        {hasDetails && (
          <button
            type="button"
            className={styles.detailsToggle}
            aria-expanded={detailsOpen}
            aria-controls={detailsPanelId}
            onClick={() => setDetailsOpen((v) => !v)}
          >
            <span>
              {detailsOpen ? t('movies.details.toggleHide') : t('movies.details.toggleShow')}
            </span>
            {detailsOpen ? (
              <ChevronUp aria-hidden size={14} />
            ) : (
              <ChevronDown aria-hidden size={14} />
            )}
          </button>
        )}
      </div>
    </>
  );

  return (
    <li className={clsx(styles.card, viewMode === 'list' && styles.cardList)}>
      <div className={styles.posterRegion}>
        {posterSrc ? (
          <img
            src={posterSrc}
            srcSet={posterSrcSet}
            sizes="(max-width: 479px) 100vw, 220px"
            alt=""
            className={styles.poster}
            width={120}
            height={180}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            decoding="async"
          />
        ) : (
          <div className={styles.posterPlaceholder} aria-hidden>
            {t('movies.search.posterPlaceholder')}
          </div>
        )}

        {m.mediaType === 'tv' && <span className={styles.tvBadge}>{t('movies.list.tvBadge')}</span>}

        {(hasDetails || canRemove) && (
          <div className={styles.kebabSlot}>
            <CardKebab
              title={m.title}
              year={m.year}
              tmdbId={m.tmdbId}
              mediaType={m.mediaType}
              isMine={isMine}
              isHost={isHost}
              canRemove={canRemove}
              onRemove={() => void onRemove(m.id)}
              t={t}
            />
          </div>
        )}

        {viewMode !== 'list' && <div className={styles.panel}>{panelContent}</div>}
      </div>

      {viewMode === 'list' && <div className={styles.listContent}>{panelContent}</div>}

      {hasDetails && detailsOpen && (
        <div className={styles.detailsOverlay}>
          <button
            type="button"
            className={styles.detailsClose}
            onClick={() => setDetailsOpen(false)}
          >
            <ChevronUp aria-hidden size={14} />
            {t('movies.details.toggleHide')}
          </button>
          <MovieDetailsContent
            tmdbId={m.tmdbId}
            mediaType={m.mediaType}
            open={detailsOpen}
            panelId={detailsPanelId}
          />
        </div>
      )}

      {providers.length > 0 && (
        <WatchProvidersModal
          open={providersOpen}
          movieTitle={m.title}
          providers={providers}
          watchPageUrl={m.tmdbWatchPageUrl}
          onClose={() => setProvidersOpen(false)}
        />
      )}
    </li>
  );
});

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

function CardKebab({
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
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(rootRef, close, open);

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
        type="button"
        className={styles.kebabBtn}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('movies.list.moreActionsAria', { title })}
      >
        <MoreVertical aria-hidden size={18} />
      </button>
      {open ? (
        <div className={styles.kebabMenu} role="menu">
          {tmdbId > 0 && (
            <>
              <ExternalMenuLink
                href={lbUrl}
                label={t('movies.list.letterboxdButton')}
                onClose={() => setOpen(false)}
              />
              <ExternalMenuLink
                href={imdbHref}
                label={t('movies.list.imdbButton')}
                onClose={() => setOpen(false)}
              />
              <ExternalMenuLink
                href={allocineHref}
                label={t('movies.list.allocineButton')}
                onClose={() => setOpen(false)}
              />
              <ExternalMenuLink
                href={tmdbHref}
                label={t('movies.list.tmdbButton')}
                onClose={() => setOpen(false)}
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
        </div>
      ) : null}
    </div>
  );
}

export default function MovieList({
  movies,
  slug,
  participantId,
  participantPseudo,
  isFinished,
  isHost = false,
  onVote,
  onRemove,
  refresh,
  onActionError,
  participantAvatars,
  participantAvatarsByPseudo,
  viewMode = 'grid',
}: Readonly<MovieListProps>) {
  const { t } = useTranslation();

  if (movies.length === 0) {
    return (
      <EmptyState
        icon={<Film size={26} aria-hidden />}
        title={t('movies.list.emptyTitle')}
        message={t('movies.list.emptyPlaceholder')}
      />
    );
  }

  return (
    <div>
      <ul className={clsx(styles.list, viewMode === 'list' && styles.listModeGrid)}>
        {movies.map((m, i) => (
          <MovieCard
            key={m.id}
            movie={m}
            slug={slug}
            participantId={participantId}
            participantPseudo={participantPseudo}
            isFinished={isFinished}
            isHost={isHost}
            eager={i < 3}
            onVote={onVote}
            onRemove={onRemove}
            refresh={refresh}
            onActionError={onActionError}
            participantAvatars={participantAvatars}
            participantAvatarsByPseudo={participantAvatarsByPseudo}
            viewMode={viewMode}
            t={t}
          />
        ))}
      </ul>
      <TmdbAttribution />
    </div>
  );
}
