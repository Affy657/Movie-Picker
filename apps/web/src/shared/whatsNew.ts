import { ROUTES } from '@/app/routes';
import type { TranslationKey } from '@/shared/i18n';

export type WhatsNewCategory = 'new' | 'improved' | 'fixed';

export type WhatsNewLinkTarget = 'watchlist' | 'account' | 'myEvents' | 'profile' | 'donate';

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

export const WHATS_NEW: readonly WhatsNewRelease[] = [
  {
    version: '1.4.0',
    entries: [
      {
        category: 'new',
        titleKey: 'whatsNew.entries.watchlist.title',
        descriptionKey: 'whatsNew.entries.watchlist.description',
        link: 'watchlist',
      },
      {
        category: 'new',
        titleKey: 'whatsNew.entries.letterboxd.title',
        descriptionKey: 'whatsNew.entries.letterboxd.description',
        link: 'account',
      },
      {
        category: 'new',
        titleKey: 'whatsNew.entries.manualPick.title',
        descriptionKey: 'whatsNew.entries.manualPick.description',
        link: 'myEvents',
      },
      {
        category: 'new',
        titleKey: 'whatsNew.entries.streak.title',
        descriptionKey: 'whatsNew.entries.streak.description',
        link: 'profile',
      },
      {
        category: 'new',
        titleKey: 'whatsNew.entries.oauth.title',
        descriptionKey: 'whatsNew.entries.oauth.description',
        link: 'account',
      },
      {
        category: 'new',
        titleKey: 'whatsNew.entries.donations.title',
        descriptionKey: 'whatsNew.entries.donations.description',
        link: 'donate',
      },
      {
        category: 'new',
        titleKey: 'whatsNew.entries.proposeIdea.title',
        descriptionKey: 'whatsNew.entries.proposeIdea.description',
        action: 'proposeIdea',
      },
      {
        category: 'improved',
        titleKey: 'whatsNew.entries.profileRevamp.title',
        descriptionKey: 'whatsNew.entries.profileRevamp.description',
        link: 'profile',
      },
      {
        category: 'improved',
        titleKey: 'whatsNew.entries.wheelExclusion.title',
        descriptionKey: 'whatsNew.entries.wheelExclusion.description',
        link: 'myEvents',
      },
      {
        category: 'improved',
        titleKey: 'whatsNew.entries.weightedWheel.title',
        descriptionKey: 'whatsNew.entries.weightedWheel.description',
        link: 'myEvents',
      },
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

export const WHATS_NEW_NAV_RELEASED_AT_MS = Date.parse('2026-08-24T00:00:00.000Z');
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
