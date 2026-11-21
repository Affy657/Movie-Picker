import { useTranslation } from '@/shared/i18n';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import type { GenreCount } from '@/features/events/api/userStatsApi';
import styles from './ProfileStatsSection.module.css';

const GENRES_MIN_PROPOSED = 5;

interface Props {
  genres: readonly GenreCount[];
  moviesProposed: number;
}

export default function ProfileGenres({ genres, moviesProposed }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  if (moviesProposed <= 0) return null;

  const shown = genres.filter((genre) => genre.count > 0);
  const ready = moviesProposed >= GENRES_MIN_PROPOSED && shown.length > 0;
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <section className={styles.panel} aria-labelledby="profile-genres-heading">
      <div className={styles.panelHead}>
        <h3 id="profile-genres-heading" className={styles.panelTitle}>
          {t('profile.stats.genres.title')}
        </h3>
        {ready && (
          <span className={styles.panelNote}>
            {t('profile.stats.genres.base', { count: moviesProposed })}
          </span>
        )}
      </div>

      {ready ? (
        <>
          <ol className={styles.genres}>
            {shown.map((genre) => {
              const share = Math.min(1, genre.count / moviesProposed);
              return (
                <li key={genre.genreId} className={styles.genre}>
                  <span className={styles.genreLabel}>{genreLabel(genre.genreId, locale)}</span>
                  <span className={styles.genreTrack} aria-hidden>
                    <span className={styles.genreFill} style={{ ['--share' as string]: share }} />
                  </span>
                  <span className={styles.genreShare}>{percent.format(share)}</span>
                </li>
              );
            })}
          </ol>
          <p className={styles.hint}>{t('profile.stats.genres.hint')}</p>
        </>
      ) : (
        <p className={styles.hint}>
          {t('profile.stats.genres.waiting', { min: GENRES_MIN_PROPOSED, count: moviesProposed })}
        </p>
      )}
    </section>
  );
}
