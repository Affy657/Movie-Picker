import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import type { EventData, MovieData } from '../types/event';

interface WheelSectionProps {
  slug: string;
  event: EventData;
  moviesCount: number;
  hostToken: string | null;
  onWheelDone: () => void;
  onCloseDone: () => void;
}

export default function WheelSection({
  slug,
  event,
  moviesCount,
  hostToken,
  onWheelDone,
  onCloseDone,
}: WheelSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<MovieData | null>(event.winnerMovie ?? null);
  const isHost = event.isHost ?? !!hostToken;

  const winnerId = event.winnerMovie?._id;
  useEffect(() => {
    setWinner(event.winnerMovie ?? null);
  }, [winnerId]);

  const baseUrl = `/events/${slug}`;
  const query = hostToken ? `?host=${encodeURIComponent(hostToken)}` : '';
  const urlWheel = `${baseUrl}/wheel${query}`;
  const urlClose = `${baseUrl}/close${query}`;

  const launchWheel = async () => {
    setError(null);
    setLoading(true);
    setSpinning(true);
    try {
      const res = await fetchApi<{ winner: MovieData; message: string }>(urlWheel, {
        method: 'POST',
      });
      setWinner(res.winner);
      setTimeout(() => setSpinning(false), 1500);
      onWheelDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setSpinning(false);
    } finally {
      setLoading(false);
    }
  };

  const closeEvent = async () => {
    setError(null);
    setLoading(true);
    try {
      await fetchApi(urlClose, { method: 'POST' });
      onCloseDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const canLaunch = isHost && !event.terminé && moviesCount > 0;
  const showRelancer = isHost && !event.terminé && winner && moviesCount > 0;
  const showClose = isHost && !event.terminé && (winner || event.closedAt);

  return (
    <section className="section section-wheel" aria-label="Roue">
      <h2>Roue</h2>
      {error && <p className="error">{error}</p>}

      {winner && (
        <div className={`wheel-result ${spinning ? 'wheel-spinning' : ''}`}>
          <p className="wheel-winner-label">Film gagnant</p>
          <p className="wheel-winner-title">{winner.title}</p>
          <p className="wheel-winner-meta">{winner.year}</p>
        </div>
      )}

      {moviesCount === 0 && !winner && (
        <p className="placeholder">Aucun film. Proposez au moins un film pour lancer la roue.</p>
      )}

      {canLaunch && !winner && (
        <button
          type="button"
          className="btn btn-primary btn-wheel"
          onClick={launchWheel}
          disabled={loading}
        >
          {loading ? 'Tirage…' : 'Lancer la roue'}
        </button>
      )}

      {showRelancer && (
        <button
          type="button"
          className="btn btn-primary btn-wheel"
          onClick={launchWheel}
          disabled={loading}
        >
          {loading ? 'Tirage…' : 'Relancer la roue'}
        </button>
      )}

      {showClose && (
        <button type="button" className="btn btn-close" onClick={closeEvent} disabled={loading}>
          Clôturer la soirée
        </button>
      )}
    </section>
  );
}
