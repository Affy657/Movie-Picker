import { describe, expect, it } from 'vitest';
import { t, type Translate } from '@/shared/i18n/t';
import { compareListProgress, listProgressLabel, watchedPercent } from './listProgress';

const fr: Translate = (key, vars) => t(key, vars, 'fr');
const en: Translate = (key, vars) => t(key, vars, 'en');
const withPercentSpace = (text: string) => text.replaceAll(/\p{Zs}/gu, ' ');

describe('watchedPercent', () => {
  it('rounds the share of watched films to the unit', () => {
    expect(watchedPercent(5, 8)).toBe(63);
    expect(watchedPercent(13, 20)).toBe(65);
    expect(watchedPercent(0, 8)).toBe(0);
  });

  it('says 100 only once every film is watched', () => {
    expect(watchedPercent(199, 200)).toBe(99);
    expect(watchedPercent(8, 8)).toBe(100);
  });

  it('has no share for an empty list', () => {
    expect(watchedPercent(0, 0)).toBeNull();
  });
});

describe('listProgressLabel', () => {
  it('writes the share with the percent sign of the language', () => {
    expect(withPercentSpace(listProgressLabel(13, 20, fr, 'fr'))).toBe('65 % vus');
    expect(listProgressLabel(13, 20, fr, 'fr')).not.toContain('65 %');
    expect(listProgressLabel(13, 20, en, 'en')).toBe('65% watched');
  });
});

describe('compareListProgress', () => {
  it('ranks lists by their watched share, empty lists below any other', () => {
    const half = { itemCount: 4, watchedCount: 2 };
    const done = { itemCount: 3, watchedCount: 3 };
    const none = { itemCount: 5, watchedCount: 0 };
    const empty = { itemCount: 0, watchedCount: 0 };

    expect([half, empty, done, none].sort(compareListProgress)).toEqual([empty, none, half, done]);
  });
});
