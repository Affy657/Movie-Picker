import { ROUTES } from '@/app/routes';
import type { TranslationKey } from '@/shared/i18n';
import {
  SHOWCASE_PROVIDERS,
  SHOWCASE_THEMES,
  type ShowcaseProvider,
  type ShowcaseTheme,
} from '@/features/movies/api/showcaseApi';

export const THEME_LABEL_KEYS: Record<ShowcaseTheme, TranslationKey> = {
  frissons: 'showcase.themes.frissons',
  'comedies-francaises': 'showcase.themes.comediesFrancaises',
  'annees-80': 'showcase.themes.annees80',
  braquages: 'showcase.themes.braquages',
  'pepites-a24': 'showcase.themes.pepitesA24',
  'annees-90': 'showcase.themes.annees90',
  'annees-2000': 'showcase.themes.annees2000',
  'moins-de-90-min': 'showcase.themes.moinsDe90Min',
  indetronables: 'showcase.themes.indetronables',
  'en-famille': 'showcase.themes.enFamille',
};

export const PROVIDER_LABEL_KEYS: Record<ShowcaseProvider, TranslationKey> = {
  netflix: 'showcase.providers.netflix',
  'prime-video': 'showcase.providers.primeVideo',
  'disney-plus': 'showcase.providers.disneyPlus',
  'canal-plus': 'showcase.providers.canalPlus',
  'apple-tv-plus': 'showcase.providers.appleTvPlus',
};

export { SHOWCASE_PROVIDERS as PROVIDER_KEYS } from '@/features/movies/api/showcaseApi';

export function isShowcaseProvider(value: string | undefined): value is ShowcaseProvider {
  return value != null && (SHOWCASE_PROVIDERS as readonly string[]).includes(value);
}

export { SHOWCASE_THEMES as THEME_KEYS } from '@/features/movies/api/showcaseApi';

export function isShowcaseTheme(value: string | undefined): value is ShowcaseTheme {
  return value != null && (SHOWCASE_THEMES as readonly string[]).includes(value);
}

export const TRENDING_GENRE_IDS = [28, 35, 53, 18, 27, 16] as const;

export function themeListPath(theme: ShowcaseTheme): string {
  return ROUTES.showcaseTheme(theme);
}
