import type { MovieData } from '../types/event';

interface MovieListProps {
  movies: MovieData[];
  participantId: string | null;
  terminé: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movieId: string) => Promise<void>;
  refresh: () => void;
}

function getParticipantId(m: MovieData): string {
  const p = m.participantId;
  return typeof p === 'object' && p !== null && '_id' in p ? (p as { _id: string })._id : String(p);
}

export default function MovieList({
  movies,
  participantId,
  terminé,
  onVote,
  onRemove,
  refresh,
}: MovieListProps) {
  if (movies.length === 0) {
    return <p className="placeholder">Aucun film proposé pour l&apos;instant.</p>;
  }

  return (
    <ul className="movie-list">
      {movies.map((m) => {
        const isMine = participantId && getParticipantId(m) === participantId;
        return (
          <li key={m._id} className="movie-card">
            {m.posterPath ? (
              <img src={m.posterPath} alt="" className="movie-poster" width={92} height={138} />
            ) : (
              <div className="movie-poster movie-poster-placeholder">Affiche</div>
            )}
            <div className="movie-info">
              <h3 className="movie-title">{m.title}</h3>
              <p className="movie-meta">
                {m.year} · Proposé par {m.proposerPseudo}
              </p>
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
  );
}
