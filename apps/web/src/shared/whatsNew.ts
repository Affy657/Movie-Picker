import { ROUTES } from '@/app/routes';
import type { TranslationKey } from '@/shared/i18n';

export type WhatsNewCategory = 'new' | 'improved' | 'fixed';

export type WhatsNewLinkTarget =
  'watchlist' | 'account' | 'myEvents' | 'profile' | 'donate' | 'home' | 'notifications';

export type WhatsNewAction = 'proposeIdea';

export type WhatsNewEntry = {
  category: WhatsNewCategory;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  link?: WhatsNewLinkTarget;
  action?: WhatsNewAction;
};

export type WhatsNewRelease = {
  version: string;
  entries: readonly WhatsNewEntry[];
};

function entry(
  slug: string,
  category: WhatsNewCategory,
  extra?: Pick<WhatsNewEntry, 'link' | 'action'>
): WhatsNewEntry {
  return {
    category,
    titleKey: `whatsNew.entries.${slug}.title` as TranslationKey,
    descriptionKey: `whatsNew.entries.${slug}.description` as TranslationKey,
    ...extra,
  };
}

export const WHATS_NEW: readonly WhatsNewRelease[] = [
  {
    version: '1.4.0',
    entries: [
      entry('watchlist', 'new', { link: 'watchlist' }),
      entry('letterboxd', 'new', { link: 'account' }),
      entry('manualPick', 'new', { link: 'myEvents' }),
      entry('streak', 'new', { link: 'profile' }),
      entry('oauth', 'new', { link: 'account' }),
      entry('donations', 'new', { link: 'donate' }),
      entry('proposeIdea', 'new', { action: 'proposeIdea' }),
      entry('pwaInstall', 'new'),
      entry('profileRevamp', 'improved', { link: 'profile' }),
      entry('wheelExclusion', 'improved', { link: 'myEvents' }),
      entry('weightedWheel', 'improved', { link: 'myEvents' }),
    ],
  },
  {
    version: '1.4.1',
    entries: [
      entry('openBrowsing', 'new', { link: 'myEvents' }),
      entry('historyToEvent', 'new', { link: 'myEvents' }),
      entry('rescheduleNotice', 'new', { link: 'notifications' }),
      entry('ideaAttachments', 'new', { action: 'proposeIdea' }),
      entry('myEventsRevamp', 'improved', { link: 'myEvents' }),
      entry('historyTools', 'improved', { link: 'myEvents' }),
      entry('settingsPage', 'improved', { link: 'account' }),
      entry('eventSettings', 'improved', { link: 'myEvents' }),
      entry('movieList', 'improved', { link: 'myEvents' }),
      entry('unifiedShare', 'improved', { link: 'myEvents' }),
      entry('discoverHome', 'improved', { link: 'home' }),
      entry('fasterFirstLoad', 'improved'),
      entry('readableContrast', 'improved'),
      entry('analyticsPrivacy', 'improved', { link: 'account' }),
      entry('inAppBrowser', 'fixed'),
    ],
  },
];

export function whatsNewLinkPath(
  target: WhatsNewLinkTarget | undefined,
  profileHandle: string | null
): string | null {
  switch (target) {
    case 'watchlist':
      return ROUTES.watchlist;
    case 'account':
      return ROUTES.account;
    case 'myEvents':
      return ROUTES.myEvents;
    case 'donate':
      return ROUTES.donate;
    case 'home':
      return ROUTES.home;
    case 'notifications':
      return ROUTES.notifications;
    case 'profile':
      return profileHandle ? ROUTES.profile(profileHandle) : null;
    default:
      return null;
  }
}

function getLatestRelease(releases: readonly WhatsNewRelease[]): WhatsNewRelease {
  const latest = releases.at(-1);
  if (!latest) throw new Error('WHATS_NEW doit contenir au moins une version.');
  return latest;
}

export const LATEST_WHATS_NEW_RELEASE: WhatsNewRelease = getLatestRelease(WHATS_NEW);

export const WHATS_NEW_NAV_RELEASED_AT_MS = Date.parse('2026-09-04T00:00:00.000Z');
export const WHATS_NEW_NAV_VISIBLE_FOR_MS = 7 * 24 * 60 * 60 * 1000;
export const WHATS_NEW_NAV_NEW_ACCOUNT_FROM_MS = WHATS_NEW_NAV_RELEASED_AT_MS + 24 * 60 * 60 * 1000;

export function shouldShowWhatsNewNavChip(
  accountCreatedAt: string | undefined | null,
  nowMs: number = Date.now()
): boolean {
  if (!accountCreatedAt) return false;
  const createdMs = Date.parse(accountCreatedAt);
  if (!Number.isFinite(createdMs)) return false;
  if (createdMs >= WHATS_NEW_NAV_NEW_ACCOUNT_FROM_MS) return false;
  return (
    nowMs >= WHATS_NEW_NAV_RELEASED_AT_MS &&
    nowMs < WHATS_NEW_NAV_RELEASED_AT_MS + WHATS_NEW_NAV_VISIBLE_FOR_MS
  );
}
