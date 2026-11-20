import { describe, expect, it } from 'vitest';
import { t, type Translate } from '@/shared/i18n/t';
import { listCountLabel, publicListCountLabel, withWatchedCount } from './listCount';

const fr: Translate = (key, vars) => t(key, vars, 'fr');

describe('listCountLabel', () => {
  it('says empty, one film or the number of films', () => {
    expect(listCountLabel(0, fr)).toBe('Vide');
    expect(listCountLabel(1, fr)).toBe('1 film');
    expect(listCountLabel(8, fr)).toBe('8 films');
  });
});

describe('publicListCountLabel', () => {
  it('counts the films, and says when several people fill the list', () => {
    expect(publicListCountLabel({ itemCount: 50, memberCount: 1 }, fr)).toBe('50 films');
    expect(publicListCountLabel({ itemCount: 8, memberCount: 3 }, fr)).toBe('8 films, à plusieurs');
  });
});

describe('withWatchedCount', () => {
  it('adds how many films were watched, as Mes listes says it', () => {
    expect(withWatchedCount('7 films', 0, fr)).toBe('7 films');
    expect(withWatchedCount('7 films', 1, fr)).toBe('7 films, 1 vu');
    expect(withWatchedCount('7 films', 4, fr)).toBe('7 films, 4 vus');
  });
});
