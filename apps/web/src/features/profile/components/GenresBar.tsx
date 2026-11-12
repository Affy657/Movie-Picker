import { useLocale } from '@/shared/i18n';
import type { GenreCount } from '@/features/events/api/userStatsApi';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import styles from './ProfileActivitySection.module.css';

interface Props {
  genres: GenreCount[];
}

export default function GenresBar({ genres }: Readonly<Props>) {
  const { locale } = useLocale();
  const shown = genres.filter((g) => g.count > 0);
  const max = Math.max(0, ...shown.map((g) => g.count));
  if (max === 0) return null;

  return (
    <ol className={styles.genres}>
      {shown.map((g) => (
        <li key={g.genreId} className={styles.genreRow}>
          <span className={styles.genreLabel}>{genreLabel(g.genreId, locale)}</span>
          <span className={styles.genreTrack} aria-hidden>
            <span className={styles.genreFill} style={{ width: `${(g.count / max) * 100}%` }} />
          </span>
          <span className={styles.genreCount}>{g.count}</span>
        </li>
      ))}
    </ol>
  );
}
