import type { RatingScale } from '@/shared/types/theme';

export const RATING_MAX = 10;

type Options = { decimals?: 0 | 1 };

export function formatRating(
  value: number,
  scale: RatingScale,
  locale: string,
  { decimals = 0 }: Options = {}
): string {
  const max = scale === 'ten' ? 10 : 5;
  const shown = scale === 'ten' ? value : value / 2;
  const text = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 1,
  }).format(shown);
  return `${text}/${max}`;
}

export function averageRating(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
