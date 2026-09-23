import { describe, expect, it } from 'vitest';
import { filmsGrid, fitScale, truncateLine, wrapLines } from './storyLayout';

const measure = (text: string) => text.length * 10;

describe('wrapLines', () => {
  it('keeps a short text on one line', () => {
    expect(wrapLines('Soirée', { maxWidth: 200, maxLines: 2, measure })).toEqual(['Soirée']);
  });

  it('breaks on words when the text is too wide', () => {
    expect(wrapLines('Soirée du vendredi', { maxWidth: 100, maxLines: 2, measure })).toEqual([
      'Soirée du',
      'vendredi',
    ]);
  });

  it('ends the last allowed line with an ellipsis when the text keeps going', () => {
    const lines = wrapLines('Une soirée au titre vraiment très long', {
      maxWidth: 100,
      maxLines: 2,
      measure,
    });

    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith('…')).toBe(true);
  });

  it('cuts a single word that never fits', () => {
    const lines = wrapLines('Anticonstitutionnellement', { maxWidth: 100, maxLines: 1, measure });

    expect(lines).toEqual(['Anticonst…']);
  });

  it('keeps a title typed with a double space whole', () => {
    expect(wrapLines('Soirée  du vendredi', { maxWidth: 500, maxLines: 2, measure })).toEqual([
      'Soirée du vendredi',
    ]);
  });
});

describe('fitScale', () => {
  it('leaves a block that fits at its full size', () => {
    expect(fitScale(800, 900)).toBe(1);
  });

  it('shrinks a block that would run past the space it has', () => {
    expect(fitScale(890, 850)).toBeCloseTo(0.955, 3);
  });

  it('leaves an empty block alone', () => {
    expect(fitScale(0, 900)).toBe(1);
  });
});

describe('truncateLine', () => {
  it('leaves a text that fits', () => {
    expect(truncateLine('Heat', { maxWidth: 100, measure })).toBe('Heat');
  });

  it('ends a too long text with an ellipsis', () => {
    expect(truncateLine('Alien, le huitième passager', { maxWidth: 100, measure })).toBe(
      'Alien, le…'
    );
  });
});

describe('filmsGrid', () => {
  it('gives one big poster to a single movie', () => {
    expect(filmsGrid(1)).toMatchObject({ columns: 1, posterWidth: 456, showYear: true });
  });

  it('keeps two or three movies on one row', () => {
    expect(filmsGrid(2).columns).toBe(2);
    expect(filmsGrid(3).columns).toBe(3);
    expect(filmsGrid(3).posterWidth).toBeLessThan(filmsGrid(2).posterWidth);
  });

  it('spreads four to six movies over three columns', () => {
    expect(filmsGrid(4)).toMatchObject({ columns: 3, showYear: false });
    expect(filmsGrid(6).columns).toBe(3);
  });

  it('drops the rating count from seven movies on', () => {
    expect(filmsGrid(7)).toMatchObject({ columns: 5, showCount: false });
    expect(filmsGrid(10).columns).toBe(5);
    expect(filmsGrid(10).posterWidth).toBeLessThan(filmsGrid(6).posterWidth);
  });
});
