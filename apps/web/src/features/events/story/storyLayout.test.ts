import { describe, expect, it } from 'vitest';
import {
  STORY_CONTENT_BOTTOM,
  STORY_HEIGHT,
  STORY_SAFE_BOTTOM,
  STORY_SAFE_TOP,
  filmSlideLayout,
  filmsGrid,
  fitScale,
  fitTitle,
  ratingsLayout,
  ratingsRowsTop,
  splitRatingText,
  truncateLine,
  wrapLines,
} from './storyLayout';

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

  it('cuts a first word too wide for its line instead of letting it run over', () => {
    const lines = wrapLines('Anticonstitutionnellement ce soir', {
      maxWidth: 120,
      maxLines: 2,
      measure,
    });

    expect(lines).toEqual(['Anticonstit…', 'ce soir']);
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

describe('fitTitle', () => {
  const measureAt = (size: number) => (text: string) => text.length * size * 0.5;
  const options = { sizes: [96, 72, 48], maxWidth: 800, maxLines: 2, measureAt };

  it('keeps the largest size when the title holds', () => {
    expect(fitTitle('Heat', options)).toEqual({ size: 96, lines: ['Heat'] });
  });

  it('wraps a title before shrinking it', () => {
    expect(fitTitle('Le Dernier Phare du Bout du Monde', options)).toEqual({
      size: 96,
      lines: ['Le Dernier Phare', 'du Bout du Monde'],
    });
  });

  it('shrinks a title too long for its lines rather than cutting it', () => {
    const title = 'Le Seigneur des anneaux la communauté';
    const fitted = fitTitle(title, options);

    expect(fitted.size).toBe(72);
    expect(fitted.lines.join(' ')).toBe(title);
  });

  it('shrinks a single word that would otherwise run over', () => {
    expect(fitTitle('Anticonstitutionnellement', options)).toEqual({
      size: 48,
      lines: ['Anticonstitutionnellement'],
    });
  });

  it('cuts only what still does not hold at the smallest size', () => {
    const long = 'Une soirée au titre vraiment très long qui déborde largement de ses deux lignes';
    const fitted = fitTitle(long, options);

    expect(fitted.size).toBe(48);
    expect(fitted.lines).toHaveLength(2);
    expect(fitted.lines[1]?.endsWith('…')).toBe(true);
  });
});

describe('filmSlideLayout', () => {
  it('gives a title on one line the poster of the design', () => {
    const layout = filmSlideLayout({ nightLines: 1, titleLines: 1, titleSize: 96 });

    expect(layout).toMatchObject({ posterWidth: 696, posterHeight: 1044 });
    expect(layout.posterTop).toBeGreaterThanOrEqual(STORY_SAFE_TOP);
  });

  it('takes the room of a longer title from the poster', () => {
    const short = filmSlideLayout({ nightLines: 1, titleLines: 1, titleSize: 96 });
    const long = filmSlideLayout({ nightLines: 2, titleLines: 2, titleSize: 96 });

    expect(long.posterHeight).toBeLessThan(short.posterHeight);
    expect(long.posterWidth / long.posterHeight).toBeCloseTo(2 / 3, 2);
  });

  it('keeps the rating out of the bottom of the screen, whatever the title', () => {
    const layout = filmSlideLayout({ nightLines: 2, titleLines: 2, titleSize: 96 });

    expect(layout.ratingCenterY + 42).toBeLessThanOrEqual(STORY_HEIGHT - STORY_SAFE_BOTTOM);
  });
});

describe('ratingsLayout', () => {
  it('keeps the rows of the design for a small night', () => {
    expect(ratingsLayout(4)).toMatchObject({ rowHeight: 168, scoreSize: 228 });
  });

  it('tightens the rows as the night grows', () => {
    expect(ratingsLayout(6).rowHeight).toBeLessThan(ratingsLayout(4).rowHeight);
    expect(ratingsLayout(9).rowHeight).toBeLessThan(ratingsLayout(6).rowHeight);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('holds %i rows above the footer', (count) => {
    const layout = ratingsLayout(count);
    const bottom = ratingsRowsTop(layout) + count * layout.rowHeight;

    expect(bottom).toBeLessThanOrEqual(STORY_CONTENT_BOTTOM);
  });

  it('keeps room for the line that counts the others under eight rows', () => {
    const layout = ratingsLayout(8);
    const bottom = ratingsRowsTop(layout) + 8 * layout.rowHeight + layout.moreHeight;

    expect(bottom).toBeLessThanOrEqual(STORY_CONTENT_BOTTOM);
  });
});

describe('splitRatingText', () => {
  it('sets the value apart from the scale', () => {
    expect(splitRatingText('4,1/5')).toEqual({ value: '4,1', scale: '/5' });
    expect(splitRatingText('9.5/10')).toEqual({ value: '9.5', scale: '/10' });
  });

  it('leaves a text without a scale whole', () => {
    expect(splitRatingText('4,1')).toEqual({ value: '4,1', scale: '' });
  });
});

describe('filmsGrid', () => {
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
