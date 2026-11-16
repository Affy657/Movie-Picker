import { describe, expect, it } from 'vitest';
import { t as translate } from '@/shared/i18n';
import type { Translate } from '@/shared/i18n';
import { onlineCountLabel, proposingLabel } from '@/features/events/utils/presenceLabels';

const t: Translate = (key, params) => translate(key, params, 'fr');

describe('presence labels', () => {
  it('names a single participant who is proposing', () => {
    expect(proposingLabel(['Léa'], t)).toBe('Léa propose un film…');
  });

  it('names two participants who are proposing', () => {
    expect(proposingLabel(['Léa', 'Tom'], t)).toBe('Léa et Tom proposent un film…');
  });

  it('counts three participants or more', () => {
    expect(proposingLabel(['Léa', 'Tom', 'Zoé'], t)).toBe('3 participants proposent un film…');
  });

  it('says nothing when nobody proposes', () => {
    expect(proposingLabel([], t)).toBeNull();
  });

  it('counts the participants online', () => {
    expect(onlineCountLabel(1, t)).toBe('1 en ligne');
    expect(onlineCountLabel(4, t)).toBe('4 en ligne');
  });
});
