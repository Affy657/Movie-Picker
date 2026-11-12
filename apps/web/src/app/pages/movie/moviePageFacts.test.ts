import { describe, expect, it } from 'vitest';
import {
  audienceOf,
  budgetLabel,
  countryNames,
  crewGroups,
  languageName,
  scoreParts,
} from '@/app/pages/movie/moviePageFacts';

describe('audienceOf', () => {
  it('reads the French ratings as an audience', () => {
    expect(audienceOf('U')).toEqual({ kind: 'all' });
    expect(audienceOf('TP')).toEqual({ kind: 'all' });
    expect(audienceOf('12')).toEqual({ kind: 'minAge', age: 12 });
    expect(audienceOf('-16')).toEqual({ kind: 'minAge', age: 16 });
  });

  it('ignores what it cannot read', () => {
    expect(audienceOf(null)).toBeNull();
    expect(audienceOf('')).toBeNull();
    expect(audienceOf('NR')).toBeNull();
  });
});

describe('languageName', () => {
  it('names the original language in the reader language, capitalised', () => {
    expect(languageName('en', 'fr')).toBe('Anglais');
    expect(languageName('ja', 'en')).toBe('Japanese');
  });

  it('gives nothing for a missing or unknown code', () => {
    expect(languageName(null, 'fr')).toBeNull();
    expect(languageName('xx-not-a-code', 'fr')).toBeNull();
  });
});

describe('countryNames', () => {
  it('names each production country', () => {
    expect(countryNames(['US', 'CA'], 'fr')).toBe('États-Unis, Canada');
  });

  it('gives nothing without countries', () => {
    expect(countryNames([], 'fr')).toBeNull();
  });
});

describe('budgetLabel', () => {
  it('writes the budget in compact dollars', () => {
    expect(budgetLabel(165_000_000, 'fr')).toMatch(/^165\sM\s?\$$/u);
    expect(budgetLabel(165_000_000, 'en')).toMatch(/165/);
  });

  it('gives nothing for an unknown budget', () => {
    expect(budgetLabel(null, 'fr')).toBeNull();
    expect(budgetLabel(0, 'fr')).toBeNull();
  });
});

describe('crewGroups', () => {
  it('groups the crew by job in reading order', () => {
    expect(
      crewGroups([
        { job: 'composer', name: 'Hans Zimmer' },
        { job: 'writer', name: 'Jon Spaihts' },
        { job: 'director', name: 'Denis Villeneuve' },
        { job: 'writer', name: 'Eric Roth' },
      ])
    ).toEqual([
      { job: 'director', names: ['Denis Villeneuve'] },
      { job: 'writer', names: ['Jon Spaihts', 'Eric Roth'] },
      { job: 'composer', names: ['Hans Zimmer'] },
    ]);
  });
});

describe('scoreParts', () => {
  it('splits a score on the reader scale', () => {
    expect(scoreParts(7.8, 'ten', 'fr')).toEqual({ value: '7,8', max: 10 });
    expect(scoreParts(8, 'five', 'en')).toEqual({ value: '4', max: 5 });
  });

  it('gives nothing without a score', () => {
    expect(scoreParts(null, 'ten', 'fr')).toBeNull();
    expect(scoreParts(0, 'ten', 'fr')).toBeNull();
  });
});
