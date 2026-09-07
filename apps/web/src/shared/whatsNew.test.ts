import { describe, it, expect } from 'vitest';
import { ROUTES } from '@/app/routes';
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
  it('reste masquée sans date de création de compte', () => {
    expect(shouldShowWhatsNewNavChip(undefined, WITHIN_WINDOW_MS)).toBe(false);
    expect(shouldShowWhatsNewNavChip(null, WITHIN_WINDOW_MS)).toBe(false);
    expect(shouldShowWhatsNewNavChip('', WITHIN_WINDOW_MS)).toBe(false);
  });

  it('reste masquée si la date de création est invalide', () => {
    expect(shouldShowWhatsNewNavChip('not-a-date', WITHIN_WINDOW_MS)).toBe(false);
  });

  it('reste masquée pour un compte créé à partir du lendemain de la livraison', () => {
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

  it('s’affiche pour un compte créé le jour de la livraison', () => {
    expect(
      shouldShowWhatsNewNavChip(
        new Date(WHATS_NEW_NAV_RELEASED_AT_MS + 12 * 60 * 60 * 1000).toISOString(),
        WITHIN_WINDOW_MS
      )
    ).toBe(true);
  });

  it('reste masquée avant la livraison', () => {
    expect(shouldShowWhatsNewNavChip(LEGACY_CREATED_AT, WHATS_NEW_NAV_RELEASED_AT_MS - 1)).toBe(
      false
    );
  });

  it('s’affiche pendant une semaine après la livraison pour un compte antérieur', () => {
    expect(shouldShowWhatsNewNavChip(LEGACY_CREATED_AT, WHATS_NEW_NAV_RELEASED_AT_MS)).toBe(true);
    expect(shouldShowWhatsNewNavChip(LEGACY_CREATED_AT, WITHIN_WINDOW_MS)).toBe(true);
    expect(
      shouldShowWhatsNewNavChip(
        LEGACY_CREATED_AT,
        WHATS_NEW_NAV_RELEASED_AT_MS + WHATS_NEW_NAV_VISIBLE_FOR_MS - 1
      )
    ).toBe(true);
  });

  it('disparaît une fois la semaine écoulée', () => {
    expect(
      shouldShowWhatsNewNavChip(
        LEGACY_CREATED_AT,
        WHATS_NEW_NAV_RELEASED_AT_MS + WHATS_NEW_NAV_VISIBLE_FOR_MS
      )
    ).toBe(false);
  });
});

describe('LATEST_WHATS_NEW_RELEASE', () => {
  it('pointe sur la 1.5.0', () => {
    expect(LATEST_WHATS_NEW_RELEASE.version).toBe('1.5.0');
  });
});

describe('whatsNewLinkPath', () => {
  it('résout home vers la racine', () => {
    expect(whatsNewLinkPath('home', null)).toBe(ROUTES.home);
  });

  it('résout myEvents vers /my-events', () => {
    expect(whatsNewLinkPath('myEvents', null)).toBe(ROUTES.myEvents);
  });

  it('résout notifications vers /notifications', () => {
    expect(whatsNewLinkPath('notifications', null)).toBe(ROUTES.notifications);
  });

  it('résout discover vers /decouvrir', () => {
    expect(whatsNewLinkPath('discover', null)).toBe(ROUTES.discover);
  });
});

describe('WHATS_NEW 1.5.0', () => {
  it('couvre les changements visibles de la version', () => {
    const slugs = LATEST_WHATS_NEW_RELEASE.entries.map((entry) =>
      entry.titleKey.replace('whatsNew.entries.', '').replace('.title', '')
    );
    expect(slugs).toEqual([
      'explorationHome',
      'homeSearch',
      'visitorNav',
      'landingRevamp',
      'personalRows',
      'streamingRow',
      'themeSelections',
      'sagas',
      'communityRanking',
      'browseLists',
      'carousels',
      'listCardDetails',
    ]);
  });
});
