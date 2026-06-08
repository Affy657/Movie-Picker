import { useLocale } from '@/shared/i18n';
import type { GenreCount } from '@/features/profile/api/profileApi';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import styles from './ProfileStatsSection.module.css';

const PALETTE = ['#3db4f2', '#4cd6b4', '#9b7bff', '#f2698a', '#f5a623', '#5c7cfa'];

function genreColor(index: number): string {
  return PALETTE[index % PALETTE.length]!;
}

interface Props {
  genres: GenreCount[];
}

export default function GenresBar({ genres }: Props) {
  const { locale } = useLocale();
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
