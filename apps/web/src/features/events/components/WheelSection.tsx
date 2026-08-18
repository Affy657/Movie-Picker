import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { useTranslation } from '@/shared/i18n';
import { MovieCardGrid } from '@/features/movies/components/MovieCardGrid';
import { MovieCardList } from '@/features/movies/components/MovieCardList';
import WheelModal from './WheelModal';
import styles from './WheelSection.module.css';

interface WheelSectionProps {
  slug: string;
  event: EventData;
  movies: MovieData[];
  wheel: EventWheelState;
  viewMode: 'grid' | 'list';
}

export default function WheelSection({
  slug,
  event,
  movies,
  wheel,
  viewMode,
}: Readonly<WheelSectionProps>) {
  const { t } = useTranslation();
  const safeMovies = movies ?? [];
  const { winner } = wheel;

  if (!winner) return null;

  const winnerFull = safeMovies.find((m) => m.id === winner.id) ?? winner;
  const participantAvatars = Object.fromEntries(
    (event.participants ?? []).filter((p) => p.avatarId).map((p) => [p.id, p.avatarId as string])
  );

  return (
    <section className="section" aria-label={t('events.wheel.viewerTitle')}>
      <h2 className={styles.sectionTitle}>
        <Trophy size={18} aria-hidden className={styles.sectionTitleIcon} />
        {t('events.wheel.viewerTitle')}
      </h2>

      {!wheel.isModalOpen && (
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

      {wheel.showReset && (
        <button type="button" className="btn" onClick={wheel.reset} disabled={wheel.loading}>
          {t('events.wheel.resetButton')}
        </button>
      )}

      {wheel.isModalOpen && wheel.winnerIndex >= 0 && (
        <WheelModal
          open={wheel.isModalOpen}
          movies={safeMovies}
          winnerIndex={wheel.winnerIndex}
          winner={winner}
          wheelKey={wheel.wheelKey}
          onClose={wheel.dismissModal}
          onRelaunch={wheel.showRelaunch ? wheel.launch : undefined}
        />
      )}
    </section>
  );
}
