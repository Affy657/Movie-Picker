import type { MovieCrewJob, MovieCrewMember } from '@/features/movies/api/moviesApi';
import type { LocaleCode } from '@/shared/i18n/locales';
import type { RatingScale } from '@/shared/types/theme';
import { RATING_MAX, ratingScaleMax } from '@/shared/utils/formatRating';

const LOCALE_TAG: Record<LocaleCode, string> = { fr: 'fr-FR', en: 'en-GB' };

const ALL_AUDIENCES = new Set(['U', 'TP', 'TOUS PUBLICS', 'ALL']);

const CREW_ORDER: readonly MovieCrewJob[] = [
  'director',
  'creator',
  'writer',
  'composer',
  'photography',
];

export type Audience = { kind: 'all' } | { kind: 'minAge'; age: number };

export interface CrewGroup {
  job: MovieCrewJob;
  names: string[];
}

export function audienceOf(certification: string | null): Audience | null {
  const raw = certification?.trim().toUpperCase() ?? '';
  if (!raw) return null;
  if (ALL_AUDIENCES.has(raw)) return { kind: 'all' };
  const age = Number(/^-?(\d{1,2})$/.exec(raw)?.[1]);
  return Number.isInteger(age) && age > 0 ? { kind: 'minAge', age } : null;
}

function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function displayName(code: string, locale: LocaleCode, type: 'language' | 'region') {
  try {
    const name = new Intl.DisplayNames([LOCALE_TAG[locale]], { type, fallback: 'none' }).of(code);
    return name ? capitalise(name) : null;
  } catch {
    return null;
  }
}

export function languageName(code: string | null, locale: LocaleCode): string | null {
  return code ? displayName(code, locale, 'language') : null;
}

export function countryNames(codes: readonly string[], locale: LocaleCode): string | null {
  const names = codes
    .map((code) => displayName(code, locale, 'region'))
    .filter((name): name is string => !!name);
  return names.length > 0 ? names.join(', ') : null;
}

export function budgetLabel(budget: number | null, locale: LocaleCode): string | null {
  if (!budget || budget <= 0) return null;
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(budget);
}

export function crewGroups(crew: readonly MovieCrewMember[]): CrewGroup[] {
  return CREW_ORDER.map((job) => ({
    job,
    names: crew.filter((member) => member.job === job).map((member) => member.name),
  })).filter((group) => group.names.length > 0);
}

export function scoreParts(
  score: number | null | undefined,
  scale: RatingScale,
  locale: LocaleCode
): { value: string; max: number } | null {
  if (score == null || Number.isNaN(score) || score <= 0) return null;
  const max = ratingScaleMax(scale);
  const value = new Intl.NumberFormat(LOCALE_TAG[locale], { maximumFractionDigits: 1 }).format(
    (score * max) / RATING_MAX
  );
  return { value, max };
}

export function countLabel(count: number, locale: LocaleCode): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale]).format(count);
}
