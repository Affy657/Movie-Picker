import { useLocale, useTranslation } from '@/shared/i18n';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import Tooltip from '@/shared/components/Tooltip';
import type { DailyActivityPoint } from '@/features/profile/api/profileApi';
import {
  aggregateWeeklyActivity,
  monthMarkers,
  weeklyIntensityLevel,
} from '@/features/profile/lib/weeklyActivity';
import styles from './ProfileStatsSection.module.css';

const ROWS_MOBILE = 2;
const LEVEL_MIX = [0, 34, 62, 100];

function cellColor(level: number): string {
  if (level === 0) return 'color-mix(in srgb, var(--color-text) 8%, transparent)';
  return `color-mix(in srgb, var(--color-primary) ${LEVEL_MIX[level]}%, var(--color-surface))`;
}

function chunk<T>(items: T[], rows: number): T[][] {
  if (rows <= 1) return [items];
  const size = Math.ceil(items.length / rows);
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

interface Props {
  points: DailyActivityPoint[];
}

export default function ActivityWeeks({ points }: Readonly<Props>) {
  const { locale } = useLocale();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  if (points.length === 0) return null;

  const weeks = aggregateWeeklyActivity(points);
  const total = weeks.reduce((sum, w) => sum + w.count, 0);
  const rows = chunk(weeks, isMobile ? ROWS_MOBILE : 1);
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className={styles.heatmapWrap}>
      <div
        className={styles.weekGroups}
        role="group"
        aria-label={t('profile.stats.activityImgAlt', { count: total })}
      >
        {rows.map((row, rowIndex) => {
          const markers = monthMarkers(row, locale);
          return (
            <div key={rowIndex} className={styles.weekRow}>
              <div className={styles.weekGrid} style={{ ['--cols' as string]: row.length }}>
                {row.map((week) => {
                  const level = weeklyIntensityLevel(week.count);
                  const date = new Date(`${week.weekStart}T00:00:00Z`);
                  const label = Number.isNaN(date.getTime())
                    ? `${week.count}`
                    : t('profile.stats.weekTooltip', {
                        count: week.count,
                        date: dateFmt.format(date),
                      });
                  return (
                    <Tooltip key={week.weekStart} label={label} className={styles.cellSlot}>
                      <span
                        className={styles.weekCell}
                        style={{ background: cellColor(level) }}
                        role="img"
                        aria-label={label}
                        tabIndex={0}
                      />
                    </Tooltip>
                  );
                })}
              </div>
              <div
                className={styles.weekMonths}
                style={{ ['--cols' as string]: row.length }}
                aria-hidden
              >
                {row.map((week, index) => (
                  <span
                    key={week.weekStart}
                    className={styles.weekMonthLabel}
                    style={{ gridColumnStart: index + 1 }}
                  >
                    {markers.find((m) => m.index === index)?.label ?? ''}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.weekLegend} aria-hidden>
        <span className={styles.legendText}>{t('profile.stats.legendLess')}</span>
        {[0, 1, 2, 3].map((level) => (
          <span
            key={level}
            className={styles.legendSwatch}
            style={{ background: cellColor(level) }}
          />
        ))}
        <span className={styles.legendText}>{t('profile.stats.legendMore')}</span>
      </div>
    </div>
  );
}
