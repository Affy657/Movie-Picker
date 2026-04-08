import type { CSSProperties } from 'react';
import { themeHueFromLabel } from '../utils/eventThemeHue';

type EventThemeBannerProps = {
  theme: string | null | undefined;
};

/** Variables CSS utilisées par `.event-theme-banner` — `CSSProperties` seul refuse les clés `--*`. */
type EventThemeBannerStyle = CSSProperties & {
  '--event-theme-hue'?: string;
};

/** Bandeau + libellé du thème de soirée (visible par tous les visiteurs). */
export default function EventThemeBanner({ theme }: EventThemeBannerProps) {
  const label = theme?.trim();
  if (!label) return null;

  const hue = themeHueFromLabel(label);
  const style: EventThemeBannerStyle | undefined =
    hue == null ? undefined : { '--event-theme-hue': String(hue) };

  return (
    <div
      className="event-theme-banner"
      style={style}
      role="status"
      aria-label={`Thème de soirée : ${label}`}
    >
      <span className="event-theme-banner-kicker">Thème</span>
      <span className="event-theme-banner-title">{label}</span>
    </div>
  );
}
