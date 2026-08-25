import type { CSSProperties } from 'react';
import clsx from 'clsx';
import { Tag } from 'lucide-react';
import { themeHueFromLabel } from '@/shared/utils/eventThemeHue';
import { useTranslation } from '@/shared/i18n';
import styles from './EventThemeBanner.module.css';

type EventThemeBannerProps = {
  theme: string | null | undefined;
  themeColor?: number | null;
  className?: string;
};

type EventThemeBannerStyle = CSSProperties & {
  '--event-theme-hue'?: string;
};

export default function EventThemeBanner({
  theme,
  themeColor,
  className,
}: Readonly<EventThemeBannerProps>) {
  const { t } = useTranslation();
  const label = theme?.trim();
  if (!label) return null;

  const hue = themeColor ?? themeHueFromLabel(label);
  const style: EventThemeBannerStyle | undefined =
    hue == null ? undefined : { '--event-theme-hue': String(hue) };

  return (
    <output
      className={clsx(styles.root, className)}
      style={style}
      aria-label={t('events.detail.themeAria', { theme: label })}
    >
      <span className={styles.iconWrap} aria-hidden>
        <Tag size={12} />
      </span>
      <span className={styles.label}>{label}</span>
    </output>
  );
}
