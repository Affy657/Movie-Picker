import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { postEventClose, postEventWheel } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import styles from './WheelSection.module.css';

const SPIN_ANIMATION_MS = 1500;

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
  const spinTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => clearTimeout(spinTimerRef.current), []);

  const winnerId = event.winnerMovie?.id;
  useEffect(() => {
    setWinner(event.winnerMovie ?? null);
  }, [winnerId]);

  const launchWheel = async () => {
    setError(null);
    setLoading(true);
    setSpinning(true);
    try {
      const res = await postEventWheel(slug, hostToken);
      setWinner(res.winner);
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = window.setTimeout(() => setSpinning(false), SPIN_ANIMATION_MS);
      onWheelDone();
    } catch (err) {
      setError(getErrorMessage(err, 'Tirage impossible'));
      setSpinning(false);
    } finally {
      setLoading(false);
    }
  };

  const closeEvent = async () => {
    setError(null);
    setLoading(true);
    try {
      await postEventClose(slug, hostToken);
      onCloseDone();
    } catch (err) {
      setError(getErrorMessage(err, 'Clôture impossible'));
    } finally {
      setLoading(false);
    }
  };

  const canLaunch = isHost && !event.isFinished && moviesCount > 0;
  const showRelancer = isHost && !event.isFinished && winner && moviesCount > 0;
  const showClose = isHost && !event.isFinished && (winner || event.closedAt);

  return (
    <section className="section" aria-label="Roue">
      <h2>Roue</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {winner && (
        <div
          className={clsx(styles.result, spinning && styles.spinning)}
          role="status"
          aria-live="polite"
        >
          <p className={styles.winnerLabel}>Film gagnant</p>
          <p className={styles.winnerTitle}>{winner.title}</p>
          <p className={styles.winnerMeta}>{winner.year}</p>
        </div>
      )}

      {moviesCount === 0 && !winner && (
        <p className="placeholder">Aucun film. Proposez au moins un film pour lancer la roue.</p>
      )}

      {canLaunch && !winner && (
        <button
          type="button"
          className={`btn btn-primary ${styles.btnWheel}`}
          onClick={() => void launchWheel()}
          disabled={loading}
        >
          {loading ? 'Tirage…' : 'Lancer la roue'}
        </button>
      )}

      {showRelancer && (
        <button
          type="button"
          className={`btn btn-primary ${styles.btnWheel}`}
          onClick={() => void launchWheel()}
          disabled={loading}
        >
          {loading ? 'Tirage…' : 'Relancer la roue'}
        </button>
      )}

      {showClose && (
        <button
          type="button"
          className={`btn ${styles.btnClose}`}
          onClick={() => void closeEvent()}
          disabled={loading}
        >
          Clôturer la soirée
        </button>
      )}
    </section>
  );
}
