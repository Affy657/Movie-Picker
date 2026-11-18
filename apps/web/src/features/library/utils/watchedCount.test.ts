import { describe, expect, it } from 'vitest';
import { t, type Translate } from '@/shared/i18n/t';
import { watchedCountLabel } from './watchedCount';

const fr: Translate = (key, vars) => t(key, vars, 'fr');

describe('watchedCountLabel', () => {
  it('says no film, one film or the number of films watched', () => {
    expect(watchedCountLabel(0, fr)).toBe('Aucun film vu');
    expect(watchedCountLabel(1, fr)).toBe('1 film vu');
    expect(watchedCountLabel(148, fr)).toBe('148 films vus');
  });
});
