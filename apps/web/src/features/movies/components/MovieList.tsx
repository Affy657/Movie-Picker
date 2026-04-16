import { memo, useState } from 'react';
import { Eye, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { MovieData } from '@/shared/types/movie';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { isSafeTmdbWatchPageUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import { markMovieAsSeen, unmarkMovieAsSeen } from '@/features/movies/api/moviesApi';
import { othersAlreadySeenHint } from '@/features/movies/utils/seenHint';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import TmdbIndicativeFooter from '@/features/movies/components/TmdbIndicativeFooter';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import MovieDetailsPanel from '@/features/movies/components/MovieDetailsPanel';
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
}

function hasTmdbEnrichment(m: MovieData): boolean {
  const providers = m.watchProviders;
  return (
    (m.voteAverage != null && !Number.isNaN(m.voteAverage)) ||
    (!!providers && providers.length > 0) ||
    isSafeTmdbWatchPageUrl(m.tmdbWatchPageUrl) ||
    (m.runtimeMinutes != null && m.runtimeMinutes > 0)
  );
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
}: MovieCardProps) {
  const isMine = participantId && getParticipantId(m) === participantId;
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
  const safeTmdbWatchUrl = isSafeTmdbWatchPageUrl(m.tmdbWatchPageUrl) ? m.tmdbWatchPageUrl : null;

  const [seenPending, setSeenPending] = useState(false);

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
      {posterSrc ? (
        <img
          src={posterSrc}
          alt=""
          className={styles.poster}
          width={92}
          height={138}
          loading="lazy"
        />
      ) : (
        <div className={`${styles.poster} ${styles.posterPlaceholder}`}>Affiche</div>
      )}
      <div className={styles.info}>
        <h3 className={styles.title}>{m.title}</h3>
        {m.year || voteLabel || runtimeLabel ? (
          <p className={`${styles.meta} ${styles.metaTmdb}`}>
            {m.year ? <span>{m.year}</span> : null}
            {voteLabel ? (
              <span className="tmdb-vote" title="Note moyenne TMDB (indicatif)">
                {m.year ? ' · ' : null}TMDB {voteLabel}
              </span>
            ) : null}
            {runtimeLabel ? (
              <span title={t('movies.list.runtimeTitle')}>
                {m.year || voteLabel ? ' · ' : null}
                {runtimeLabel}
              </span>
            ) : null}
          </p>
        ) : null}
        <p className={`${styles.meta} ${styles.metaProposer}`}>
          {isMine ? (
            <>
              {t('movies.list.proposedByMeLead')}
              <span className={styles.selfProposer}>{t('movies.list.proposedByMeSelf')}</span>
            </>
          ) : (
            t('movies.list.proposedBy', { pseudo: m.proposerPseudo })
          )}
        </p>
        <WatchProviderChips
          providers={providers}
          variant="compact"
          className={styles.cardProviders}
          watchPageUrl={safeTmdbWatchUrl}
        />
        {seenHint ? <p className={styles.seenHint}>{seenHint}</p> : null}
        {m.tmdbId > 0 ? <MovieDetailsPanel tmdbId={m.tmdbId} /> : null}
        {!isFinished && participantId && (
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void onVote(m.id, 1)}
              aria-label={`${t('movies.list.voteUp')} ${m.title}`}
            >
              <ThumbsUp aria-hidden size={16} /> {m.up}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void onVote(m.id, -1)}
              aria-label={`${t('movies.list.voteDown')} ${m.title}`}
            >
              <ThumbsDown aria-hidden size={16} /> {m.down}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${iMarkedSeen ? styles.seenActive : ''}`}
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
              <Eye aria-hidden size={16} />{' '}
              {m.seenCount
                ? t('movies.seen.labelWithCount', { count: m.seenCount })
                : t('movies.seen.label')}
            </button>
            {canRemove && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => void onRemove(m.id)}
                aria-label={
                  isMine
                    ? `${t('movies.list.removeButton')} ${m.title}`
                    : t('movies.list.removeAsHostAria', { title: m.title })
                }
                title={!isMine && isHost ? t('movies.list.removeAsHostTitle') : undefined}
              >
                {t('movies.list.removeButton')}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
});

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
}: MovieListProps) {
  const { t } = useTranslation();

  if (movies.length === 0) {
    return <p className="placeholder">{t('movies.list.emptyPlaceholder')}</p>;
  }

  const showTmdbFooter = movies.some(hasTmdbEnrichment);

  return (
    <div>
      <ul className={styles.list}>
        {movies.map((m) => (
          <MovieCard
            key={m.id}
            movie={m}
            slug={slug}
            participantId={participantId}
            participantPseudo={participantPseudo}
            isFinished={isFinished}
            isHost={isHost}
            onVote={onVote}
            onRemove={onRemove}
            refresh={refresh}
            onActionError={onActionError}
            t={t}
          />
        ))}
      </ul>
      {showTmdbFooter ? (
        <TmdbIndicativeFooter className={`tmdb-indicative-footer ${styles.tmdbFooter}`} />
      ) : null}
    </div>
  );
}
