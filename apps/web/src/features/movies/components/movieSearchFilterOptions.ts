import type { RatingScale } from '@/shared/types/theme';

export const MOVIE_GENRE_IDS = [
  28, 35, 53, 27, 878, 18, 12, 14, 10749, 80, 16, 10751, 99, 9648, 36, 10402, 10752, 37,
] as const;

export const VOTE_MIN_OPTIONS = [{ tmdb: 6 }, { tmdb: 7 }, { tmdb: 8 }] as const;

export function voteMinLabel(tmdb: number, scale: RatingScale = 'five'): string {
  if (scale === 'ten') return String(tmdb);
  const five = tmdb / 2;
  return Number.isInteger(five) ? String(five) : five.toFixed(1);
}

export const DECADE_OPTIONS = ['2020', '2010', '2000', '1990', '1980'] as const;

export const AVAILABILITY_OPTIONS = [
  { type: 'flatrate', fr: 'Streaming', en: 'Streaming' },
  { type: 'rent', fr: 'Location', en: 'Rental' },
  { type: 'buy', fr: 'Achat', en: 'Purchase' },
] as const;

export const LANGUAGE_OPTIONS = [
  { code: 'fr', fr: 'Français', en: 'French', flag: '🇫🇷' },
  { code: 'en', fr: 'Anglais', en: 'English', flag: '🇬🇧' },
  { code: 'ja', fr: 'Japonais', en: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', fr: 'Coréen', en: 'Korean', flag: '🇰🇷' },
  { code: 'es', fr: 'Espagnol', en: 'Spanish', flag: '🇪🇸' },
  { code: 'de', fr: 'Allemand', en: 'German', flag: '🇩🇪' },
  { code: 'it', fr: 'Italien', en: 'Italian', flag: '🇮🇹' },
  { code: 'zh', fr: 'Chinois', en: 'Chinese', flag: '🇨🇳' },
] as const;

export function localizedName(fr: string, en: string, lang: string): string {
  return lang.startsWith('fr') ? fr : en;
}
