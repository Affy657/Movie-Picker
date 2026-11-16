import { describe, expect, it } from 'vitest';
import { matchesListSearch, sortListSummaries } from './listSummaries';

const halloween = { name: 'Halloween', itemCount: 8, updatedAt: '2026-10-01T00:00:00Z' };
const cultes = { name: 'Films cultes', itemCount: 23, updatedAt: '2026-11-01T00:00:00Z' };
const ghibli = { name: 'ghibli', itemCount: 0, updatedAt: '2026-09-01T00:00:00Z' };
const lists = [halloween, cultes, ghibli];

const names = (items: readonly { name: string }[]) => items.map((item) => item.name);

describe('sortListSummaries', () => {
  it('puts the last updated list first by default', () => {
    expect(names(sortListSummaries(lists, 'recent', 'desc'))).toEqual([
      'Films cultes',
      'Halloween',
      'ghibli',
    ]);
  });

  it('sorts by name without minding the case, and by number of films', () => {
    expect(names(sortListSummaries(lists, 'name', 'asc'))).toEqual([
      'Films cultes',
      'ghibli',
      'Halloween',
    ]);
    expect(names(sortListSummaries(lists, 'size', 'desc'))).toEqual([
      'Films cultes',
      'Halloween',
      'ghibli',
    ]);
  });

  it('puts the most watched list first by progress, empty lists last', () => {
    const progress = [
      { ...halloween, watchedCount: 8 },
      { ...cultes, watchedCount: 2 },
      { ...ghibli, watchedCount: 0 },
    ];

    expect(names(sortListSummaries(progress, 'progress', 'desc'))).toEqual([
      'Halloween',
      'Films cultes',
      'ghibli',
    ]);
  });

  it('reverses the order on the ascending direction', () => {
    expect(names(sortListSummaries(lists, 'recent', 'asc'))).toEqual([
      'ghibli',
      'Halloween',
      'Films cultes',
    ]);
  });

  it('leaves the given array untouched', () => {
    const copy = [...lists];
    sortListSummaries(lists, 'name', 'asc');
    expect(lists).toEqual(copy);
  });
});

describe('matchesListSearch', () => {
  it('finds a list by a part of its name, accents and case aside', () => {
    expect(matchesListSearch('Films cultes', 'CULT')).toBe(true);
    expect(matchesListSearch('À voir', 'a vo')).toBe(true);
    expect(matchesListSearch('Halloween', 'ghibli')).toBe(false);
  });

  it('keeps every list while the search is empty', () => {
    expect(matchesListSearch('Halloween', '  ')).toBe(true);
  });
});
