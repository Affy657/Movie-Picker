import { describe, it, expect } from 'vitest';
import { ROUTES } from '@/app/routes';
import { APP_VERSION } from '@/shared/appVersion';
import {
  shouldShowWhatsNewNavChip,
  whatsNewLinkPath,
  LATEST_WHATS_NEW_RELEASE,
  WHATS_NEW_NAV_RELEASED_AT_MS,
  WHATS_NEW_NAV_VISIBLE_FOR_MS,
  WHATS_NEW_NAV_NEW_ACCOUNT_FROM_MS,
} from '@/shared/whatsNew';

const LEGACY_CREATED_AT = '2026-06-01T12:00:00.000Z';
const WITHIN_WINDOW_MS = WHATS_NEW_NAV_RELEASED_AT_MS + 3 * 24 * 60 * 60 * 1000;

describe('shouldShowWhatsNewNavChip', () => {
  it('stays hidden without an account creation date', () => {
    expect(shouldShowWhatsNewNavChip(undefined, WITHIN_WINDOW_MS)).toBe(false);
    expect(shouldShowWhatsNewNavChip(null, WITHIN_WINDOW_MS)).toBe(false);
    expect(shouldShowWhatsNewNavChip('', WITHIN_WINDOW_MS)).toBe(false);
  });

  it('stays hidden when the creation date is invalid', () => {
    expect(shouldShowWhatsNewNavChip('not-a-date', WITHIN_WINDOW_MS)).toBe(false);
  });

  it('stays hidden for an account created from the day after the release', () => {
    expect(
      shouldShowWhatsNewNavChip(
        new Date(WHATS_NEW_NAV_NEW_ACCOUNT_FROM_MS).toISOString(),
        WITHIN_WINDOW_MS
      )
    ).toBe(false);
    expect(
      shouldShowWhatsNewNavChip(
        new Date(WHATS_NEW_NAV_NEW_ACCOUNT_FROM_MS + 60_000).toISOString(),
        WITHIN_WINDOW_MS
      )
    ).toBe(false);
  });

  it('shows for an account created on the release day', () => {
    expect(
      shouldShowWhatsNewNavChip(
        new Date(WHATS_NEW_NAV_RELEASED_AT_MS + 12 * 60 * 60 * 1000).toISOString(),
        WITHIN_WINDOW_MS
      )
    ).toBe(true);
  });

  it('stays hidden before the release', () => {
    expect(shouldShowWhatsNewNavChip(LEGACY_CREATED_AT, WHATS_NEW_NAV_RELEASED_AT_MS - 1)).toBe(
      false
    );
  });

  it('shows for a week after the release for an older account', () => {
    expect(shouldShowWhatsNewNavChip(LEGACY_CREATED_AT, WHATS_NEW_NAV_RELEASED_AT_MS)).toBe(true);
    expect(shouldShowWhatsNewNavChip(LEGACY_CREATED_AT, WITHIN_WINDOW_MS)).toBe(true);
    expect(
      shouldShowWhatsNewNavChip(
        LEGACY_CREATED_AT,
        WHATS_NEW_NAV_RELEASED_AT_MS + WHATS_NEW_NAV_VISIBLE_FOR_MS - 1
      )
    ).toBe(true);
  });

  it('disappears once the week has elapsed', () => {
    expect(
      shouldShowWhatsNewNavChip(
        LEGACY_CREATED_AT,
        WHATS_NEW_NAV_RELEASED_AT_MS + WHATS_NEW_NAV_VISIBLE_FOR_MS
      )
    ).toBe(false);
  });
});

describe('LATEST_WHATS_NEW_RELEASE', () => {
  it('pointe sur la 1.6.0', () => {
    expect(LATEST_WHATS_NEW_RELEASE.version).toBe('1.6.0');
  });

  it('annonce la version que le pied de page affiche', () => {
    expect(LATEST_WHATS_NEW_RELEASE.version).toBe(APP_VERSION);
  });
});

describe('whatsNewLinkPath', () => {
  it('resolves home to the root', () => {
    expect(whatsNewLinkPath('home', null)).toBe(ROUTES.home);
  });

  it('resolves myEvents to /my-events', () => {
    expect(whatsNewLinkPath('myEvents', null)).toBe(ROUTES.myEvents);
  });

  it('resolves notifications to /notifications', () => {
    expect(whatsNewLinkPath('notifications', null)).toBe(ROUTES.notifications);
  });

  it('resolves discover to /decouvrir', () => {
    expect(whatsNewLinkPath('howItWorks', null)).toBe(ROUTES.howItWorks);
  });
});

describe('WHATS_NEW 1.6.0', () => {
  it('couvre les changements visibles de la version', () => {
    const slugs = LATEST_WHATS_NEW_RELEASE.entries.map((entry) =>
      entry.titleKey.replace('whatsNew.entries.', '').replace('.title', '')
    );
    expect(slugs).toEqual([
      'userSearch',
      'recurringEvents',
      'eventTemplates',
      'multipleWinners',
      'voteLimit',
      'friendsWatchlist',
      'openEventMovies',
      'wheelAnnounce',
      'letterboxdFromCard',
      'scrollableDialogs',
      'offlineEventPage',
    ]);
  });
});
