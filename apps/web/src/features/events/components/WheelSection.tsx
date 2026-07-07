import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Disc3 } from 'lucide-react';
import { deleteEventWheel, postEventClose, postEventWheel } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { MovieCardGrid } from '@/features/movies/components/MovieCardGrid';
import { MovieCardList } from '@/features/movies/components/MovieCardList';
import WheelModal from './WheelModal';
import styles from './WheelSection.module.css';

interface WheelSectionProps {
  slug: string;
  event: EventData;
  movies: MovieData[];
  hostToken: string | null;
  onWheelDone: () => void;
  onCloseDone: () => void;
  viewMode: 'grid' | 'list';
}

export default function WheelSection({
  slug,
  event,
  movies,
  hostToken,
  onWheelDone,
  onCloseDone,
  viewMode,
}: Readonly<WheelSectionProps>) {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [wheelKey, setWheelKey] = useState(0);
  const [winner, setWinner] = useState<MovieData | null>(event.winnerMovie ?? null);
  const isHost = event.isHost === true || (event.isHost == null && !!hostToken);
  const safeMovies = movies ?? [];
  const moviesCount = safeMovies.length;

  useEffect(() => {
    setWinner(event.winnerMovie ?? null);
  }, [event.winnerMovie]);

  const launchWheel = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await postEventWheel(slug, hostToken);
      const idx = safeMovies.findIndex((m) => m.id === res.winner.id);
      setWinner(res.winner);
      setWinnerIndex(Math.max(idx, 0));
      setWheelKey((k) => k + 1);
      setIsModalOpen(true);
      track('movie_picked');
    } catch (err) {
      setError(getErrorMessage(err, t('events.wheel.launchError')));
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    onWheelDone();
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
  const showRelancer = isHost && !event.isFinished && !!winner && moviesCount > 0;
  const showClose = isHost && !event.isFinished && (!!winner || !!event.closedAt);

  const handleModalRelaunch = () => {
    void launchWheel();
  };

  const resetWheel = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteEventWheel(slug, hostToken);
      setWinner(null);
      onWheelDone();
    } catch (err) {
      setError(getErrorMessage(err, t('events.wheel.resetError')));
    } finally {
      setLoading(false);
    }
  };

  if (!isHost && !winner) {
    return null;
  }

  const sectionTitle = isHost ? t('events.wheel.title') : t('events.wheel.viewerTitle');

  const winnerFull = winner ? (safeMovies.find((m) => m.id === winner.id) ?? winner) : null;

  const participantAvatars = Object.fromEntries(
    (event.participants ?? []).filter((p) => p.avatarId).map((p) => [p.id, p.avatarId as string])
  );

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

      {moviesCount === 0 && !winner && isHost && (
        <p className="placeholder">{t('events.wheel.emptyPlaceholder')}</p>
      )}

      {winnerFull && !isModalOpen && (
        <div className={styles.winnerSection} aria-live="polite">
          <p className={styles.winnerLabel}>{t('events.wheel.winnerLabel')}</p>
          <ul
            className={clsx(
              styles.winnerWrapper,
              viewMode === 'list' ? styles.winnerWrapperList : styles.winnerWrapperGrid
            )}
          >
            {viewMode === 'list' ? (
              <MovieCardList
                movie={winnerFull}
                slug={slug}
                participantId={null}
                participantPseudo={null}
                isFinished={true}
                isHost={false}
                onVote={async () => {}}
                onRemove={async () => {}}
                refresh={() => {}}
                onActionError={() => {}}
                participantAvatars={participantAvatars}
                t={t}
                eager
              />
            ) : (
              <MovieCardGrid
                movie={winnerFull}
                slug={slug}
                participantId={null}
                participantPseudo={null}
                isFinished={true}
                isHost={false}
                onVote={async () => {}}
                onRemove={async () => {}}
                refresh={() => {}}
                onActionError={() => {}}
                participantAvatars={participantAvatars}
                t={t}
                eager
              />
            )}
          </ul>
        </div>
      )}

      {canLaunch && !winner && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void launchWheel()}
          disabled={loading}
        >
          {loading ? t('events.wheel.spinning') : t('events.wheel.launchButton')}
        </button>
      )}

      {showRelancer && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void launchWheel()}
          disabled={loading}
        >
          {loading ? t('events.wheel.spinning') : t('events.wheel.relaunchButton')}
        </button>
      )}

      {isHost && !event.isFinished && !!winner && (
        <button
          type="button"
          className={`btn ${styles.btnReset}`}
          onClick={() => void resetWheel()}
          disabled={loading}
        >
          {t('events.wheel.resetButton')}
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

      {isModalOpen && winner && winnerIndex >= 0 && (
        <WheelModal
          open={isModalOpen}
          movies={safeMovies}
          winnerIndex={winnerIndex}
          winner={winner}
          wheelKey={wheelKey}
          onClose={handleModalClose}
          onRelaunch={showRelancer ? handleModalRelaunch : undefined}
        />
      )}
    </section>
  );
}
