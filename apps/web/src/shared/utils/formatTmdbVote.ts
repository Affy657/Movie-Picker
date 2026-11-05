import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';

export function formatTmdbVote(
  v: number | null | undefined,
  scale: RatingScale | undefined,
  locale: string
): string | null {
  if (v == null || Number.isNaN(v) || v === 0) return null;
  return formatRating(v, scale ?? 'five', locale, { decimals: 1 });
}
