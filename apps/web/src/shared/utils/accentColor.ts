import type { AccentColor } from '@/shared/types/theme';
import { ACCENT_COLORS } from '@/shared/types/theme';

export function isAccentColor(v: unknown): v is AccentColor {
  return typeof v === 'string' && (ACCENT_COLORS as readonly string[]).includes(v);
}
