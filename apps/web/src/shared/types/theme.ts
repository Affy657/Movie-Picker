import type { ApiSchemas } from '@/shared/api/contract';

export type UiThemePreference = ApiSchemas['UiThemePreference'];

export type RatingScale = ApiSchemas['RatingScale'];

export const RATING_SCALES: readonly RatingScale[] = ['five', 'ten'];

export type AccentColor = ApiSchemas['AccentColor'];

export const ACCENT_COLORS: readonly AccentColor[] = [
  'default',
  'blue',
  'teal',
  'green',
  'lime',
  'gold',
  'orange',
  'pink',
  'purple',
] as const;
