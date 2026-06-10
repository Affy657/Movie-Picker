import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Disc3, Trophy } from 'lucide-react';
import { postEventClose, postEventWheel } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
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
}: Readonly<WheelSectionProps>) {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<MovieData | null>(event.winnerMovie ?? null);
  const isHost = event.isHost === true || (event.isHost == null && !!hostToken);
  const spinTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => clearTimeout(spinTimerRef.current), []);

  useEffect(() => {
    setWinner(event.winnerMovie ?? null);
  }, [event.winnerMovie]);

  const launchWheel = async () => {
    setError(null);
    setLoading(true);
    setSpinning(true);
    try {
      const res = await postEventWheel(slug, hostToken);
      setWinner(res.winner);
      track('movie_picked');
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = globalThis.setTimeout(() => setSpinning(false), SPIN_ANIMATION_MS);
      onWheelDone();
    } catch (err) {
      setError(getErrorMessage(err, t('events.wheel.launchError')));
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
      track('event_closed');
      onCloseDone();
    } catch (err) {
      setError(getErrorMessage(err, t('events.wheel.closeError')));
    } finally {
      setLoading(false);
    }
  };

  const canLaunch = isHost && !event.isFinished && moviesCount > 0;
  const showRelancer = isHost && !event.isFinished && winner && moviesCount > 0;
  const showClose = isHost && !event.isFinished && (winner || event.closedAt);

  if (!isHost && !winner) {
    return null;
  }

  const sectionTitle = isHost ? t('events.wheel.title') : t('events.wheel.viewerTitle');

  return (
    <section className="section" aria-label={sectionTitle}>
      <h2 className={styles.sectionTitle}>
        <Disc3 size={18} aria-hidden className={styles.sectionTitleIcon} />
        {sectionTitle}
      </h2>
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
          <Trophy size={28} aria-hidden className={styles.winnerIcon} />
          <p className={styles.winnerLabel}>{t('events.wheel.winnerLabel')}</p>
          <p className={styles.winnerTitle}>{winner.title}</p>
          {winner.year ? <p className={styles.winnerMeta}>{winner.year}</p> : null}
        </div>
      )}

      {moviesCount === 0 && !winner && isHost && (
        <p className="placeholder">{t('events.wheel.emptyPlaceholder')}</p>
      )}

      {canLaunch && !winner && (
        <button
          type="button"
          className={`btn btn-primary ${styles.btnWheel}`}
          onClick={() => void launchWheel()}
          disabled={loading}
        >
          {loading ? t('events.wheel.spinning') : t('events.wheel.launchButton')}
        </button>
      )}

      {showRelancer && (
        <button
          type="button"
          className={`btn btn-primary ${styles.btnWheel}`}
          onClick={() => void launchWheel()}
          disabled={loading}
        >
          {loading ? t('events.wheel.spinning') : t('events.wheel.relaunchButton')}
        </button>
      )}

      {showClose && (
        <button
          type="button"
          className={`btn ${styles.btnClose}`}
          onClick={() => void closeEvent()}
          disabled={loading}
        >
          {t('events.wheel.closeButton')}
        </button>
      )}
    </section>
  );
}
