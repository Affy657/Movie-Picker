import type { TranslationKey } from '@/shared/i18n';

export type WhatsNewCategory = 'new' | 'improved' | 'fixed';

export type WhatsNewEntry = {
  category: WhatsNewCategory;
  textKey: TranslationKey;
};

export type WhatsNewRelease = {
  version: string;
  entries: readonly WhatsNewEntry[];
};

export const WHATS_NEW: readonly WhatsNewRelease[] = [
  {
    version: '1.4.0',
    entries: [
      { category: 'new', textKey: 'whatsNew.entries.watchlist' },
      { category: 'new', textKey: 'whatsNew.entries.letterboxd' },
      { category: 'new', textKey: 'whatsNew.entries.manualPick' },
      { category: 'new', textKey: 'whatsNew.entries.streak' },
      { category: 'new', textKey: 'whatsNew.entries.oauth' },
      { category: 'new', textKey: 'whatsNew.entries.donations' },
      { category: 'new', textKey: 'whatsNew.entries.wheelExclusion' },
    ],
  },
];

function getLatestRelease(releases: readonly WhatsNewRelease[]): WhatsNewRelease {
  const latest = releases.at(-1);
  if (!latest) throw new Error('WHATS_NEW doit contenir au moins une version.');
  return latest;
}

export const LATEST_WHATS_NEW_RELEASE: WhatsNewRelease = getLatestRelease(WHATS_NEW);
