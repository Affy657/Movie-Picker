import type { RatingScale } from '@/shared/types/theme';

export const RATING_MAX = 10;

type Options = { decimals?: 0 | 1 };

export function ratingScaleMax(scale: RatingScale): number {
  return scale === 'ten' ? RATING_MAX : RATING_MAX / 2;
}

export function formatRating(
  value: number,
  scale: RatingScale,
  locale: string,
  { decimals = 0 }: Options = {}
): string {
  const max = ratingScaleMax(scale);
  const shown = (value * max) / RATING_MAX;
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

export function averageOfRatings(
  ratings: readonly { value: number }[] | null | undefined
): number | null {
  return averageRating((ratings ?? []).map((rating) => rating.value));
}
