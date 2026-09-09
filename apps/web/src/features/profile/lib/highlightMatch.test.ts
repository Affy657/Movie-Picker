import { describe, expect, it } from 'vitest';
import { splitOnMatch } from './highlightMatch';

describe('splitOnMatch', () => {
  it('returns the whole value as a single unmatched segment when the query is empty', () => {
    expect(splitOnMatch('Léa Moreau', '')).toEqual([{ text: 'Léa Moreau', matched: false }]);
  });

  it('returns the whole value as a single unmatched segment when nothing matches', () => {
    expect(splitOnMatch('Léa Moreau', 'zephyrin')).toEqual([
      { text: 'Léa Moreau', matched: false },
    ]);
  });

  it('splits around a match in the middle', () => {
    expect(splitOnMatch('Julien Morin', 'mor')).toEqual([
      { text: 'Julien ', matched: false },
      { text: 'Mor', matched: true },
      { text: 'in', matched: false },
    ]);
  });

  it('keeps the original accents in the matched segment', () => {
    expect(splitOnMatch('Léa Moreau', 'lea')).toEqual([
      { text: 'Léa', matched: true },
      { text: ' Moreau', matched: false },
    ]);
  });

  it('matches an accented query against an unaccented value', () => {
    expect(splitOnMatch('Lea Moreau', 'léa')).toEqual([
      { text: 'Lea', matched: true },
      { text: ' Moreau', matched: false },
    ]);
  });

  it('omits an empty leading segment when the match starts at the beginning', () => {
    expect(splitOnMatch('sofiamorgane', 'sofia')).toEqual([
      { text: 'sofia', matched: true },
      { text: 'morgane', matched: false },
    ]);
  });

  it('omits an empty trailing segment when the match ends the value', () => {
    expect(splitOnMatch('jmorin', 'orin')).toEqual([
      { text: 'jm', matched: false },
      { text: 'orin', matched: true },
    ]);
  });

  it('highlights only the first occurrence', () => {
    expect(splitOnMatch('morgane morin', 'mor')).toEqual([
      { text: 'mor', matched: true },
      { text: 'gane morin', matched: false },
    ]);
  });

  it('trims the query before matching', () => {
    expect(splitOnMatch('Julien Morin', '  mor  ')).toEqual([
      { text: 'Julien ', matched: false },
      { text: 'Mor', matched: true },
      { text: 'in', matched: false },
    ]);
  });
});
