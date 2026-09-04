import clsx from 'clsx';
import { Tag } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './EventThemeBanner.module.css';

type EventThemeBannerProps = {
  theme: string | null | undefined;
  className?: string;
};

export default function EventThemeBanner({ theme, className }: Readonly<EventThemeBannerProps>) {
  const { t } = useTranslation();
  const label = theme?.trim();
  if (!label) return null;

  return (
    <output
      className={clsx(styles.root, className)}
      aria-label={t('events.detail.themeAria', { theme: label })}
    >
      <span className={styles.iconWrap} aria-hidden>
        <Tag size={12} />
      </span>
      <span className={styles.label}>{label}</span>
    </output>
  );
}
