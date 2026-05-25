import { memo, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { ExternalLink, Eye, MoreVertical, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import type { MovieData } from '@/shared/types/movie';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { isSafeTmdbWatchPageUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import { markMovieAsSeen, unmarkMovieAsSeen } from '@/features/movies/api/moviesApi';
import { othersAlreadySeenHint } from '@/features/movies/utils/seenHint';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import {
  MovieDetailsToggle,
  MovieDetailsContent,
} from '@/features/movies/components/MovieDetailsPanel';
import TmdbAttribution from '@/features/movies/components/TmdbAttribution';
import styles from './MovieList.module.css';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

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
  eager?: boolean;
}

const MovieCard = memo(function MovieCard({
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
  eager = false,
}: MovieCardProps) {
  const isMine = participantId && getParticipantId(m) === participantId;
  const proposerAvatarId = participantAvatars?.[getParticipantId(m)] ?? '';
  const canRemove = isMine || isHost;
  const iMarkedSeen = !!(
    participantPseudo &&
    m.seenByPseudos &&
    m.seenByPseudos.includes(participantPseudo)
  );
  const seenHint = othersAlreadySeenHint(m.seenByPseudos, participantPseudo, t);
  const voteLabel = formatTmdbVote(m.voteAverage);
  const runtimeLabel = formatRuntimeMinutes(m.runtimeMinutes);
  const providers = m.watchProviders ?? [];
  const posterSrc = posterImageSrc(m.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const safeTmdbWatchUrl = isSafeTmdbWatchPageUrl(m.tmdbWatchPageUrl) ? m.tmdbWatchPageUrl : null;

  const [seenPending, setSeenPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsPanelId = useId();
  const hasDetails = m.tmdbId > 0;

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

  return (
    <li className={styles.card}>
      <div className={styles.posterCol}>
        {posterSrc ? (
          <img
            src={posterSrc}
            srcSet={posterSrcSet}
            sizes="92px"
            alt=""
            className={styles.poster}
            width={92}
            height={138}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            decoding="async"
          />
        ) : (
          <div className={`${styles.poster} ${styles.posterPlaceholder}`}>Affiche</div>
        )}
        {hasDetails ? (
          <MovieDetailsToggle
            open={detailsOpen}
            onToggle={() => setDetailsOpen((v) => !v)}
            panelId={detailsPanelId}
            className={styles.detailsToggle}
          />
        ) : null}
      </div>
      <div className={styles.info}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>
            {m.title}
            {m.mediaType === 'tv' && (
              <span className={styles.mediaTypeBadge}>{t('movies.list.tvBadge')}</span>
            )}
          </h3>
          {m.tmdbId > 0 || canRemove ? (
            <CardKebab
              title={m.title}
              year={m.year}
              tmdbId={m.tmdbId}
              mediaType={m.mediaType}
              isMine={!!isMine}
              isHost={isHost}
              canRemove={!!canRemove}
              onRemove={() => void onRemove(m.id)}
              t={t}
            />
          ) : null}
        </div>
        <p className={styles.metaLine}>
          {m.year ? <span className={styles.metaItem}>{m.year}</span> : null}
          {runtimeLabel ? (
            <span className={styles.metaItem} title={t('movies.list.runtimeTitle')}>
              {runtimeLabel}
            </span>
          ) : null}
          {voteLabel ? (
            <span
              className={clsx(styles.metaItem, 'tmdb-vote')}
              title={t('movies.list.tmdbVoteTitle')}
            >
              {voteLabel}
            </span>
          ) : null}
        </p>
        {providers.length > 0 ? (
          <WatchProviderChips
            providers={providers}
            title={m.title}
            variant="compact"
            className={styles.cardProviders}
            watchPageUrl={safeTmdbWatchUrl}
            maxVisible={3}
          />
        ) : (
          <p className={styles.providersEmpty}>{t('movies.watchProviders.emptyLabel')}</p>
        )}
        {seenHint ? <p className={styles.seenHint}>{seenHint}</p> : null}
        <p className={styles.proposerLine}>
          {m.proposerPseudo ? (
            <>
              <Avatar avatarId={proposerAvatarId} size="xs" className={styles.proposerAvatar} />
              {isMine ? (
                <>
                  {t('movies.list.proposedByMeLead')}
                  <span className={styles.selfProposer}>{t('movies.list.proposedByMeSelf')}</span>
                </>
              ) : (
                t('movies.list.proposedBy', { pseudo: m.proposerPseudo })
              )}
            </>
          ) : null}
        </p>
        {!isFinished && participantId && (
          <div className={styles.actions} role="group" aria-label={m.title}>
            <button
              type="button"
              className={clsx(styles.actionBtn, m.myVote === 1 && styles.voteUpActive)}
              onClick={() => void onVote(m.id, 1)}
              aria-pressed={m.myVote === 1}
              aria-label={
                m.myVote === 1
                  ? t('movies.list.voteUpRemoveAria', { title: m.title })
                  : `${t('movies.list.voteUp')} ${m.title}`
              }
            >
              <ThumbsUp aria-hidden size={16} />
              <span className={styles.actionCount}>{m.up}</span>
            </button>
            <button
              type="button"
              className={clsx(styles.actionBtn, m.myVote === -1 && styles.voteDownActive)}
              onClick={() => void onVote(m.id, -1)}
              aria-pressed={m.myVote === -1}
              aria-label={
                m.myVote === -1
                  ? t('movies.list.voteDownRemoveAria', { title: m.title })
                  : `${t('movies.list.voteDown')} ${m.title}`
              }
            >
              <ThumbsDown aria-hidden size={16} />
              <span className={styles.actionCount}>{m.down}</span>
            </button>
            <button
              type="button"
              className={clsx(styles.actionBtn, iMarkedSeen && styles.seenActive)}
              onClick={() => void handleToggleSeen()}
              disabled={seenPending}
              aria-pressed={iMarkedSeen}
              aria-label={
                iMarkedSeen
                  ? t('movies.seen.unmarkAria', { title: m.title })
                  : t('movies.seen.markAria', { title: m.title })
              }
              title={t('movies.seen.neutralTooltip')}
            >
              <Eye aria-hidden size={16} />
              <span className={styles.actionLabel}>
                {m.seenCount
                  ? t('movies.seen.labelWithCount', { count: m.seenCount })
                  : t('movies.seen.label')}
              </span>
            </button>
          </div>
        )}
      </div>
      {hasDetails ? (
        <MovieDetailsContent
          tmdbId={m.tmdbId}
          mediaType={m.mediaType}
          open={detailsOpen}
          panelId={detailsPanelId}
          className={styles.detailsPanel}
        />
      ) : null}
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
}: {
  href: string;
  label: string;
  onClose: () => void;
}) {
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
}: CardKebabProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

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
}: MovieListProps) {
  const { t } = useTranslation();

  if (movies.length === 0) {
    return <p className="placeholder">{t('movies.list.emptyPlaceholder')}</p>;
  }

  return (
    <div>
      <ul className={styles.list}>
        {movies.map((m, i) => (
          <MovieCard
            key={m.id}
            movie={m}
            slug={slug}
            participantId={participantId}
            participantPseudo={participantPseudo}
            isFinished={isFinished}
            isHost={isHost}
            eager={i < 2}
            onVote={onVote}
            onRemove={onRemove}
            refresh={refresh}
            onActionError={onActionError}
            participantAvatars={participantAvatars}
            t={t}
          />
        ))}
      </ul>
      <TmdbAttribution />
    </div>
  );
}
