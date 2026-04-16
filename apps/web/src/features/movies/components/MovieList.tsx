import { memo } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { MovieData } from '@/shared/types/movie';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { othersAlreadySeenHint } from '@/shared/utils/movieReactions';
import { isSafeTmdbWatchPageUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import TmdbIndicativeFooter from '@/features/movies/components/TmdbIndicativeFooter';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import MovieReactionBar from '@/features/movies/components/MovieReactionBar';
import MovieDetailsPanel from '@/features/movies/components/MovieDetailsPanel';
import styles from './MovieList.module.css';

interface MovieListProps {
  movies: MovieData[];
  slug: string;
  allowedReactionIds: readonly string[];
  participantId: string | null;
  participantPseudo: string | null;
  isFinished: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movieId: string) => Promise<void>;
  refresh: () => void;
  onReactionError: (message: string) => void;
}

interface MovieCardProps {
  movie: MovieData;
  slug: string;
  allowedReactionIds: readonly string[];
  participantId: string | null;
  participantPseudo: string | null;
  isFinished: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movieId: string) => Promise<void>;
  refresh: () => void;
  onReactionError: (message: string) => void;
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
  allowedReactionIds,
  participantId,
  participantPseudo,
  isFinished,
  onVote,
  onRemove,
  refresh,
  onReactionError,
}: MovieCardProps) {
  const isMine = participantId && getParticipantId(m) === participantId;
  const seenHint = othersAlreadySeenHint(m.reactions, participantPseudo);
  const voteLabel = formatTmdbVote(m.voteAverage);
  const runtimeLabel = formatRuntimeMinutes(m.runtimeMinutes);
  const providers = m.watchProviders ?? [];
  const posterSrc = posterImageSrc(m.posterPath);
  const safeTmdbWatchUrl = isSafeTmdbWatchPageUrl(m.tmdbWatchPageUrl) ? m.tmdbWatchPageUrl : null;

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
              <span title="Durée du film">
                {m.year || voteLabel ? ' · ' : null}
                {runtimeLabel}
              </span>
            ) : null}
          </p>
        ) : null}
        <p className={`${styles.meta} ${styles.metaProposer}`}>Proposé par {m.proposerPseudo}</p>
        <WatchProviderChips
          providers={providers}
          variant="compact"
          className={styles.cardProviders}
          watchPageUrl={safeTmdbWatchUrl}
        />
        {seenHint ? <p className={styles.seenHint}>{seenHint}</p> : null}
        {m.tmdbId > 0 ? <MovieDetailsPanel tmdbId={m.tmdbId} /> : null}
        <MovieReactionBar
          slug={slug}
          movieId={m.id}
          participantId={participantId}
          participantPseudo={participantPseudo}
          reactions={m.reactions}
          allowedReactionIds={allowedReactionIds}
          readOnly={isFinished || allowedReactionIds.length === 0}
          onRefresh={refresh}
          onError={onReactionError}
        />
        {isMine && <span className={styles.badgeMe}>C&apos;est moi</span>}
        {!isFinished && participantId && (
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void onVote(m.id, 1)}
              aria-label={`Voter pour ${m.title}`}
            >
              <ThumbsUp aria-hidden size={16} /> {m.up}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void onVote(m.id, -1)}
              aria-label={`Voter contre ${m.title}`}
            >
              <ThumbsDown aria-hidden size={16} /> {m.down}
            </button>
            {isMine && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => void onRemove(m.id)}
                aria-label={`Retirer ${m.title}`}
              >
                Retirer
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
  allowedReactionIds,
  participantId,
  participantPseudo,
  isFinished,
  onVote,
  onRemove,
  refresh,
  onReactionError,
}: MovieListProps) {
  if (movies.length === 0) {
    return <p className="placeholder">Aucun film proposé pour l&apos;instant.</p>;
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
            allowedReactionIds={allowedReactionIds}
            participantId={participantId}
            participantPseudo={participantPseudo}
            isFinished={isFinished}
            onVote={onVote}
            onRemove={onRemove}
            refresh={refresh}
            onReactionError={onReactionError}
          />
        ))}
      </ul>
      {showTmdbFooter ? (
        <TmdbIndicativeFooter className={`tmdb-indicative-footer ${styles.tmdbFooter}`} />
      ) : null}
    </div>
  );
}
