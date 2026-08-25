import type { RatingScale } from '@/shared/types/theme';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';

export const MOVIE_GENRE_IDS = [
  28, 35, 53, 27, 878, 18, 12, 14, 10749, 80, 16, 10751, 99, 9648, 36, 10402, 10752, 37,
] as const;

export const VOTE_MIN_OPTIONS = [{ tmdb: 6 }, { tmdb: 7 }, { tmdb: 8 }] as const;

export const MOVIE_LIST_VOTE_MIN_OPTIONS = [
  { tmdb: 5 },
  { tmdb: 6 },
  { tmdb: 7 },
  { tmdb: 8 },
] as const;

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

export const RUNTIME_MIN_MINUTES = 0;
export const RUNTIME_MAX_MINUTES = 180;
export const RUNTIME_STEP_MINUTES = 5;

export function runtimeRangeLabel(minutes: number, lang: string, bound?: 'min' | 'max'): string {
  const inFrench = lang.startsWith('fr');
  if (bound === 'min') return runtimeMinBoundLabel(minutes, inFrench);
  if (bound === 'max') return runtimeMaxBoundLabel(minutes, inFrench);
  return formatRuntimeMinutes(minutes) ?? String(minutes);
}

function runtimeMinBoundLabel(minutes: number, inFrench: boolean): string {
  if (minutes <= RUNTIME_MIN_MINUTES) return inFrench ? 'Aucun minimum' : 'No minimum';
  return `${formatRuntimeMinutes(minutes) ?? minutes} ${inFrench ? 'ou plus' : 'or more'}`;
}

function runtimeMaxBoundLabel(minutes: number, inFrench: boolean): string {
  if (minutes >= RUNTIME_MAX_MINUTES) return inFrench ? 'Aucun maximum' : 'No maximum';
  return `${formatRuntimeMinutes(minutes) ?? minutes} ${inFrench ? 'ou moins' : 'or less'}`;
}

export function runtimeChipLabel(
  runtimeMin: number | undefined,
  runtimeMax: number | undefined,
  range: [number, number],
  lang: string
): string {
  if (runtimeMin !== undefined && runtimeMax !== undefined) {
    return `${runtimeRangeLabel(range[0], lang)} - ${runtimeRangeLabel(range[1], lang)}`;
  }
  if (runtimeMin !== undefined) return runtimeRangeLabel(range[0], lang, 'min');
  return runtimeRangeLabel(range[1], lang, 'max');
}
