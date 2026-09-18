import clsx from 'clsx';
import { useLocale, useTranslation } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import {
  formatEventDateLong,
  formatEventTime,
  formatMyEventsListDate,
} from '@/shared/utils/formatMyEventsListDate';
import styles from './EventDateChip.module.css';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

export type EventDateChipTone = 'default' | 'soon' | 'live' | 'pending';

const TONE_CLASS: Record<EventDateChipTone, string | undefined> = {
  default: undefined,
  soon: styles.tileSoon,
  live: styles.tileLive,
  pending: styles.tilePending,
};

interface EventDateChipProps {
  date: string;
  time?: string;
  tone?: EventDateChipTone;
}

export default function EventDateChip({
  date,
  time,
  tone = 'default',
}: Readonly<EventDateChipProps>) {
  const { locale } = useLocale();
  const { t } = useTranslation();
  const parts = date.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts as [number, number, number];
  const parsed = new Date(y, m - 1, d);
  if (Number.isNaN(parsed.getTime())) return null;

  const month = new Intl.DateTimeFormat(LOCALE_TAG[locale], { month: 'short' }).format(parsed);
  const spokenDate = time
    ? formatEventDateLong(date, time, locale, t('events.detail.dateTimeJoiner'))
    : formatMyEventsListDate(date, locale);

  return (
    <span className={clsx(styles.tile, TONE_CLASS[tone])}>
      <span className="visually-hidden">{spokenDate}</span>
      <span className={styles.month} aria-hidden>
        {month}
      </span>
      <span className={styles.day} aria-hidden>
        {d}
      </span>
      {time ? (
        <span className={styles.time} aria-hidden>
          {formatEventTime(time)}
        </span>
      ) : null}
    </span>
  );
}
