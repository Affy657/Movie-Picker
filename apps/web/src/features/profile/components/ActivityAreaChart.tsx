import { useLocale } from '@/shared/i18n';
import type { MonthlyActivityPoint } from '@/features/profile/api/profileApi';
import styles from './ProfileStatsSection.module.css';

const W = 720;
const H = 240;
const PAD_X = 16;
const PAD_TOP = 28;
const PAD_BOTTOM = 30;
const GRADIENT_ID = 'profileActivityFill';

function monthShort(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return '';
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date);
}

interface Props {
  points: MonthlyActivityPoint[];
}

export default function ActivityAreaChart({ points }: Props) {
  const { locale } = useLocale();
  const total = points.reduce((sum, p) => sum + p.count, 0);
  if (points.length === 0 || total === 0) return null;

  const max = Math.max(1, ...points.map((p) => p.count));
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const baseline = PAD_TOP + innerH;

  const coords = points.map((p, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + innerH * (1 - p.count / max),
    point: p,
  }));

  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  if (!firstCoord || !lastCoord) return null;

  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${lastCoord.x.toFixed(1)} ${baseline} L ${firstCoord.x.toFixed(1)} ${baseline} Z`;

  return (
    <svg
      className={styles.area}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={coords
        .map((c) => `${monthShort(c.point.month, locale)}: ${c.point.count}`)
        .join(', ')}
    >
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PAD_X} y1={baseline} x2={W - PAD_X} y2={baseline} className={styles.areaBaseline} />
      <path d={area} fill={`url(#${GRADIENT_ID})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c) => (
        <g key={c.point.month}>
          <circle cx={c.x} cy={c.y} r="3.5" className={styles.areaDot} />
          {c.point.count > 0 && (
            <text x={c.x} y={c.y - 9} className={styles.areaValue} textAnchor="middle">
              {c.point.count}
            </text>
          )}
          <text x={c.x} y={H - 9} className={styles.areaLabel} textAnchor="middle">
            {monthShort(c.point.month, locale)}
          </text>
        </g>
      ))}
    </svg>
  );
}
