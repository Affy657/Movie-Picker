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
      { category: 'improved', textKey: 'whatsNew.entries.wheelExclusion' },
      { category: 'improved', textKey: 'whatsNew.entries.whatsNewModal' },
    ],
  },
];

export const LATEST_WHATS_NEW_RELEASE: WhatsNewRelease = WHATS_NEW.at(-1)!;
