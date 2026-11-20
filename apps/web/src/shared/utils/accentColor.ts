import type { AccentColor } from '@/shared/types/theme';
import { ACCENT_COLORS } from '@/shared/types/theme';

const ACCENT_ZONE_CLASS: Readonly<Record<AccentColor, string>> = {
  default: 'accent-default',
  blue: 'accent-blue',
  teal: 'accent-teal',
  green: 'accent-green',
  lime: 'accent-lime',
  gold: 'accent-gold',
  orange: 'accent-orange',
  pink: 'accent-pink',
  purple: 'accent-purple',
};

export function isAccentColor(v: unknown): v is AccentColor {
  return typeof v === 'string' && (ACCENT_COLORS as readonly string[]).includes(v);
}

export function accentZoneClass(color: AccentColor): string {
  return ACCENT_ZONE_CLASS[color];
}

export function isChosenAccent(color: AccentColor | null | undefined): color is AccentColor {
  return !!color && color !== 'default';
}
