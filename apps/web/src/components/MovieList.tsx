import type { MovieData } from '../types/event';
import { posterImageSrc } from '../utils/posterUrl';
import { formatTmdbVote } from '../utils/formatTmdbVote';
import { othersAlreadySeenHint } from '../utils/movieReactions';
import TmdbIndicativeFooter from './TmdbIndicativeFooter';
import WatchProviderChips from './WatchProviderChips';
import MovieReactionBar from './MovieReactionBar';

interface MovieListProps {
  movies: MovieData[];
  slug: string;
  allowedReactionIds: readonly string[];
  participantId: string | null;
  participantPseudo: string | null;
  terminé: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movieId: string) => Promise<void>;
  refresh: () => void;
  onReactionError: (message: string) => void;
}

function getParticipantId(m: MovieData): string {
  const p = m.participantId;
  return typeof p === 'object' && p !== null && '_id' in p ? (p as { _id: string })._id : String(p);
}

function hasTmdbEnrichment(m: MovieData): boolean {
  const providers = m.watchProviders;
  return (
    (m.voteAverage != null && !Number.isNaN(m.voteAverage)) ||
    (!!providers && providers.length > 0) ||
    !!m.tmdbWatchPageUrl
  );
}

export default function MovieList({
  movies,
  slug,
  allowedReactionIds,
  participantId,
  participantPseudo,
  terminé,
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
    <div className="movie-list-wrap">
      <ul className="movie-list">
        {movies.map((m) => {
          const isMine = participantId && getParticipantId(m) === participantId;
          const seenHint = othersAlreadySeenHint(m.reactions, participantPseudo);
          const voteLabel = formatTmdbVote(m.voteAverage);
          const providers = m.watchProviders ?? [];
          const posterSrc = posterImageSrc(m.posterPath);
          return (
            <li key={m._id} className="movie-card">
              {posterSrc ? (
                <img src={posterSrc} alt="" className="movie-poster" width={92} height={138} />
              ) : (
                <div className="movie-poster movie-poster-placeholder">Affiche</div>
              )}
              <div className="movie-info">
                <h3 className="movie-title">{m.title}</h3>
                <p className="movie-meta">
                  {m.year} · Proposé par {m.proposerPseudo}
                  {voteLabel ? (
                    <span className="tmdb-vote" title="Note moyenne TMDB (indicatif)">
                      {' '}
                      · TMDB {voteLabel}
                    </span>
                  ) : null}
                </p>
                <WatchProviderChips
                  providers={providers}
                  className="watch-provider-chips movie-card-providers"
                />
                {m.tmdbWatchPageUrl ? (
                  <a
                    className="tmdb-watch-link"
                    href={m.tmdbWatchPageUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Où regarder (TMDB)
                  </a>
                ) : null}
                {seenHint ? <p className="movie-already-seen-hint">{seenHint}</p> : null}
                <MovieReactionBar
                  slug={slug}
                  movieId={m._id}
                  participantId={participantId}
                  participantPseudo={participantPseudo}
                  reactions={m.reactions}
                  allowedReactionIds={allowedReactionIds}
                  readOnly={terminé || allowedReactionIds.length === 0}
                  onRefresh={refresh}
                  onError={onReactionError}
                />
                {isMine && <span className="badge badge-me">C&apos;est moi</span>}
                {!terminé && participantId && (
                  <div className="movie-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onVote(m._id, 1).then(refresh)}
                      title="Upvote"
                    >
                      ↑ {m.up}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onVote(m._id, -1).then(refresh)}
                      title="Downvote"
                    >
                      ↓ {m.down}
                    </button>
                    {isMine && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => onRemove(m._id).then(refresh)}
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {showTmdbFooter ? (
        <TmdbIndicativeFooter className="tmdb-indicative-footer movie-list-tmdb-footer" />
      ) : null}
    </div>
  );
}
