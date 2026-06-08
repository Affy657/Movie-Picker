import { useLocale } from '@/shared/i18n';
import type { GenreCount } from '@/features/profile/api/profileApi';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import styles from './ProfileStatsSection.module.css';

const SIZE = 140;
const RADIUS = 52;
const STROKE = 22;
const CIRC = 2 * Math.PI * RADIUS;

// Monochrome accent palette: each segment mixes the accent with the border at a
// decreasing strength, so the donut stays theme- and accent-aware.
function segmentColor(index: number, total: number): string {
  const pct = total <= 1 ? 100 : Math.round(100 - (index * 84) / (total - 1));
  return `color-mix(in srgb, var(--color-primary) ${pct}%, var(--color-border))`;
}

interface Props {
  genres: GenreCount[];
}

export default function GenresDonut({ genres }: Props) {
  const { locale } = useLocale();
  const total = genres.reduce((sum, g) => sum + g.count, 0);
  if (total === 0) return null;

  let offset = 0;
  const segments = genres.map((g, i) => {
    const len = (g.count / total) * CIRC;
    const seg = {
      key: g.genreId,
      color: segmentColor(i, genres.length),
      dasharray: `${len} ${CIRC - len}`,
      dashoffset: -offset,
      label: genreLabel(g.genreId, locale),
      count: g.count,
    };
    offset += len;
    return seg;
  });

  return (
    <div className={styles.donutWrap}>
      <svg
        className={styles.donut}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-hidden="true"
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </g>
      </svg>
      <ul className={styles.legend}>
        {segments.map((s) => (
          <li key={s.key} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: s.color }}
              aria-hidden="true"
            />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendCount}>{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
