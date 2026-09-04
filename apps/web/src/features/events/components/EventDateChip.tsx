import clsx from 'clsx';
import { useLocale } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import styles from './EventDateChip.module.css';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

interface EventDateChipProps {
  date: string;
  live?: boolean;
}

export default function EventDateChip({ date, live = false }: Readonly<EventDateChipProps>) {
  const { locale } = useLocale();
  const parts = date.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts as [number, number, number];
  const parsed = new Date(y, m - 1, d);
  if (Number.isNaN(parsed.getTime())) return null;

  const month = new Intl.DateTimeFormat(LOCALE_TAG[locale], { month: 'short' }).format(parsed);

  return (
    <span className={clsx(styles.chip, live && styles.chipLive)} aria-hidden>
      <span className={styles.month}>{month}</span>
      <span className={styles.day}>{d}</span>
    </span>
  );
}
