import { useLocale } from '@/shared/i18n';
import type { DailyActivityPoint } from '@/features/profile/api/profileApi';
import styles from './ProfileStatsSection.module.css';

const ROWS = 7;

function intensityLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

const LEVEL_MIX = [0, 28, 48, 70, 100];

function cellColor(level: number): string {
  if (level === 0) return 'color-mix(in srgb, var(--color-text) 8%, transparent)';
  return `color-mix(in srgb, var(--color-primary) ${LEVEL_MIX[level]}%, var(--color-surface))`;
}

interface Props {
  points: DailyActivityPoint[];
}

export default function ActivityHeatmap({ points }: Props) {
  const { locale } = useLocale();
  if (points.length === 0) return null;

  const cols = Math.ceil(points.length / ROWS);
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const total = points.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className={styles.heatmapWrap}>
      <div
        className={styles.heatmap}
        style={{ ['--cols' as string]: cols }}
        role="img"
        aria-label={`${total}`}
      >
        {points.map((p) => {
          const level = intensityLevel(p.count);
          const dt = new Date(`${p.date}T00:00:00Z`);
          const title = Number.isNaN(dt.getTime())
            ? `${p.count}`
            : `${p.count} — ${dateFmt.format(dt)}`;
          return (
            <span
              key={p.date}
              className={styles.heatCell}
              style={{ background: cellColor(level) }}
              title={title}
            />
          );
        })}
      </div>
    </div>
  );
}
