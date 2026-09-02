import type { MovieData } from '@/shared/types/movie';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import WheelModal from './WheelModal';
import styles from './WheelSection.module.css';

interface WheelSectionProps {
  movies: MovieData[];
  wheel: EventWheelState;
}

export default function WheelSection({ movies, wheel }: Readonly<WheelSectionProps>) {
  const { t } = useTranslation();
  const { winner, spinWinner, pickMethod } = wheel;
  const modalMovie = spinWinner ?? winner;

  if (!winner && !wheel.isModalOpen) return null;

  const pageMovie = winner ?? modalMovie;
  if (!pageMovie) return null;

  const winnerFull = movies.find((m) => m.id === pageMovie.id) ?? pageMovie;
  const posterSrc = posterImageSrc(winnerFull.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const providers = winnerFull.watchProviders ?? [];

  return (
    <section className={styles.section} aria-labelledby="event-winner-heading">
      {winner ? (
        <div className={styles.lockup} aria-live="polite">
          {posterSrc ? (
            <div className={styles.posterFrame}>
              <img
                src={posterSrc}
                srcSet={posterSrcSet}
                sizes="108px"
                alt=""
                className={styles.poster}
                width={108}
                height={162}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          ) : null}

          <div className={styles.body}>
            <p className={styles.kicker}>
              <span className={styles.kickerLabel}>{t('events.wheel.winnerLabel')}</span>
              {pickMethod === 'manual' ? (
                <span className={styles.methodBadge}>{t('events.wheel.manualPickBadge')}</span>
              ) : null}
            </p>
            <h2 id="event-winner-heading" className={styles.title}>
              {winnerFull.title}
            </h2>
            <p className={styles.meta}>
              {winnerFull.year ? <span>{winnerFull.year}</span> : null}
              {winnerFull.proposerPseudo ? (
                <span>{t('movies.list.proposedBy', { pseudo: winnerFull.proposerPseudo })}</span>
              ) : null}
            </p>
            {providers.length > 0 ? (
              <div className={styles.providers}>
                <WatchProviderChips
                  providers={providers}
                  watchPageUrl={winnerFull.tmdbWatchPageUrl}
                  variant="compact"
                  maxVisible={6}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <h2 id="event-winner-heading" className="visually-hidden">
          {t('events.wheel.modal.spinningTitle')}
        </h2>
      )}

      {wheel.isModalOpen && wheel.winnerIndex >= 0 && modalMovie && (
        <WheelModal
          open={wheel.isModalOpen}
          movies={wheel.eligibleMovies}
          winnerIndex={wheel.winnerIndex}
          winner={modalMovie}
          wheelKey={wheel.wheelKey}
          onClose={wheel.dismissModal}
          onSpinComplete={wheel.revealWinner}
          onRelaunch={wheel.showRelaunch && !wheel.manualReveal ? wheel.launch : undefined}
          skipSpin={wheel.manualReveal}
        />
      )}
    </section>
  );
}
