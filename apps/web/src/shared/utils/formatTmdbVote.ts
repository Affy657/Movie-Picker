import type { RatingScale } from '@/shared/types/theme';

export function formatTmdbVote(
  v: number | null | undefined,
  scale: RatingScale = 'five'
): string | null {
  if (v == null || Number.isNaN(v) || v === 0) return null;
  if (scale === 'ten') return `${v.toFixed(1)}/10`;
  return `${(v / 2).toFixed(1)}/5`;
}
