import { ROUTES } from '@/app/routes';

export const PRERENDERED_ROUTES = [
  ROUTES.howItWorks,
  ROUTES.donate,
  ROUTES.tech,
  ROUTES.legalNotice,
  ROUTES.privacyPolicy,
] as const;

export const PRERENDERED_ROUTE_CHUNKS: Record<string, string> = {
  [ROUTES.howItWorks]: 'LandingPage',
  [ROUTES.donate]: 'DonatePage',
  [ROUTES.tech]: 'TechPage',
  [ROUTES.legalNotice]: 'LegalNoticePage',
  [ROUTES.privacyPolicy]: 'PrivacyPolicyPage',
};

export const PRERENDERED_FOR_FIRST_PAINT_ONLY: ReadonlyArray<string> = [
  ROUTES.legalNotice,
  ROUTES.privacyPolicy,
];

export const PRERENDER_LOCALE = 'fr';
