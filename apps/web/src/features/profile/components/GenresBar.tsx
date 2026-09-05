import { useLocale, useTranslation } from '@/shared/i18n';
import type { GenreCount } from '@/features/profile/api/profileApi';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import styles from './ProfileStatsSection.module.css';

const HUES = [255, 195, 155, 310, 65, 20];

function genreColor(index: number): string {
  return `oklch(0.72 0.13 ${HUES[index % HUES.length]})`;
}

interface Props {
  genres: GenreCount[];
}

export default function GenresBar({ genres }: Readonly<Props>) {
  const { locale } = useLocale();
  const { t } = useTranslation();
  const total = genres.reduce((sum, g) => sum + g.count, 0);
  if (total === 0) return null;

  const segments = genres.map((g, i) => ({
    key: g.genreId,
    color: genreColor(i),
    label: genreLabel(g.genreId, locale),
    count: g.count,
    pct: (g.count / total) * 100,
  }));

  return (
    <div className={styles.genres}>
      <p className={styles.genresCaption}>
        {t('profile.stats.genresCumulative', { count: String(total) })}
      </p>
      <ul className={styles.genreChips}>
        {segments.map((s) => (
          <li key={s.key} className={styles.genreChip}>
            <span className={styles.genreDot} style={{ background: s.color }} aria-hidden />
            <span className={styles.genreLabel}>{s.label}</span>
            <span className={styles.genreCount}>{s.count}</span>
          </li>
        ))}
      </ul>
      <div
        className={styles.genreBar}
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(', ')}
      >
        {segments.map((s) => (
          <span
            key={s.key}
            className={styles.genreSegment}
            style={{ width: `${s.pct}%`, background: s.color }}
          />
        ))}
      </div>
    </div>
  );
}
