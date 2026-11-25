import { describe, expect, it } from 'vitest';
import { letterboxdListReport } from '@/mocks/handlers';
import type { LetterboxdSyncReport } from '@/features/letterboxd/api/letterboxdApi';
import {
  listChanged,
  pendingChoicesOf,
  reportedLists,
  syncMeasureOf,
  truncatedLists,
  unmatchedTitlesOf,
} from './syncReport';

function reportOf(lists: LetterboxdSyncReport['lists']): LetterboxdSyncReport {
  return { skipped: false, error: null, lists };
}

const CHOICE = {
  rowIndex: 1,
  title: 'Alien',
  year: '1979',
  letterboxdSlug: 'alien',
  target: 'watched' as const,
  rating: null,
  watchedOn: null,
  candidates: [],
};

describe('syncReport', () => {
  it('reports every list read, and an unread one only for what it still changed', () => {
    const report = reportOf([
      letterboxdListReport('watchlist', { incomplete: true, removed: 2 }),
      letterboxdListReport('watched', { incomplete: true }),
    ]);

    expect(reportedLists(report).map((list) => list.target)).toEqual(['watchlist']);
  });

  it('tells which list changed', () => {
    const report = reportOf([
      letterboxdListReport('watchlist'),
      letterboxdListReport('watched', { removed: 1 }),
    ]);

    expect([listChanged(report, 'watchlist'), listChanged(report, 'watched')]).toEqual([
      false,
      true,
    ]);
    expect(syncMeasureOf(report)).toEqual({ changed: true, pendingChoices: 0 });
  });

  it('gathers the choices, the unmatched titles and the truncated lists of all the lists', () => {
    const report = reportOf([
      letterboxdListReport('watchlist', { unmatchedTitles: ['Heat (1995)'], totalTruncated: 3 }),
      letterboxdListReport('watched', {
        unmatchedTitles: ['Heat (1995)', 'Ran (1985)'],
        pendingChoices: [CHOICE],
      }),
    ]);

    expect(pendingChoicesOf(report)).toEqual([CHOICE]);
    expect(unmatchedTitlesOf(report)).toEqual(['Heat (1995)', 'Ran (1985)']);
    expect(truncatedLists(report).map((list) => list.target)).toEqual(['watchlist']);
  });
});
