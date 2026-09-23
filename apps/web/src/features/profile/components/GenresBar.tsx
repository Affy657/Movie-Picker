import { useLocale, useTranslation } from '@/shared/i18n';
import type { GenreCount } from '@/features/events/api/userStatsApi';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import styles from './ProfileStatsSection.module.css';

const GENRE_COLOR_TOKENS = [
  '--color-genre-0',
  '--color-genre-1',
  '--color-genre-2',
  '--color-genre-3',
  '--color-genre-4',
  '--color-genre-5',
] as const;

function genreColor(index: number): string {
  return `var(${GENRE_COLOR_TOKENS[index % GENRE_COLOR_TOKENS.length]})`;
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
