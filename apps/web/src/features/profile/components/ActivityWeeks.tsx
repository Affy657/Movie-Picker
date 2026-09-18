import clsx from 'clsx';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import Tooltip from '@/shared/components/Tooltip';
import type { DailyActivityPoint } from '@/features/events/api/userStatsApi';
import {
  aggregateWeeklyActivity,
  monthMarkers,
  weeklyIntensityLevel,
} from '@/features/profile/lib/weeklyActivity';
import styles from './ProfileStatsSection.module.css';

const ROWS_MOBILE = 2;
const HEAT_CLASS = [styles.heat0, styles.heat1, styles.heat2, styles.heat3] as const;

function heatClass(level: number): string | undefined {
  return HEAT_CLASS[level];
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
      <fieldset
        className={styles.weekGroups}
        aria-label={t('profile.stats.activityImgAlt', { count: total })}
      >
        {rows.map((row) => {
          const markers = monthMarkers(row, locale);
          const rowKey = row[0]?.weekStart ?? row.map((w) => w.weekStart).join('-');
          return (
            <div key={rowKey} className={styles.weekRow}>
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
                      <button
                        type="button"
                        className={clsx(styles.weekCell, heatClass(level))}
                        aria-label={label}
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
      </fieldset>
      <div className={styles.weekLegend} aria-hidden>
        <span className={styles.legendText}>{t('profile.stats.legendLess')}</span>
        {[0, 1, 2, 3].map((level) => (
          <span key={level} className={clsx(styles.legendSwatch, heatClass(level))} />
        ))}
        <span className={styles.legendText}>{t('profile.stats.legendMore')}</span>
      </div>
    </div>
  );
}
