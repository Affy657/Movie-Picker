import type { CSSProperties } from 'react';
import { Tag } from 'lucide-react';
import { themeHueFromLabel } from '@/shared/utils/eventThemeHue';
import styles from './EventThemeBanner.module.css';

type EventThemeBannerProps = {
  theme: string | null | undefined;
  themeColor?: number | null;
};

type EventThemeBannerStyle = CSSProperties & {
  '--event-theme-hue'?: string;
};

export default function EventThemeBanner({ theme, themeColor }: EventThemeBannerProps) {
  const label = theme?.trim();
  if (!label) return null;

  const hue = themeColor ?? themeHueFromLabel(label);
  const style: EventThemeBannerStyle | undefined =
    hue == null ? undefined : { '--event-theme-hue': String(hue) };

  return (
    <div
      className={styles.root}
      style={style}
      role="status"
      aria-label={`Thème de soirée : ${label}`}
    >
      <span className={styles.iconWrap} aria-hidden>
        <Tag size={16} />
      </span>
      <div className={styles.body}>
        <span className={styles.kicker}>Thème</span>
        <span className={styles.title}>{label}</span>
      </div>
    </div>
  );
}
