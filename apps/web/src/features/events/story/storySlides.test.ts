import { describe, expect, it } from 'vitest';
import { storyFamilies, storySlides, storyFileName } from './storySlides';
import type { MovieData } from '@/shared/types/movie';

const movie = (id: string, title: string, year: string): MovieData =>
  ({ id, title, year }) as MovieData;

const three = [
  movie('1', 'Inception', '2010'),
  movie('2', 'Heat', '1995'),
  movie('3', 'Matrix', '1999'),
];

describe('storyFamilies', () => {
  it('offers the three families when the night has several movies', () => {
    expect(storyFamilies(three).map((f) => f.key)).toEqual(['films', 'film', 'ratings']);
  });

  it('drops the all movies family when the night has a single movie', () => {
    expect(storyFamilies(three.slice(0, 1)).map((f) => f.key)).toEqual(['film', 'ratings']);
  });
});

describe('storySlides', () => {
  it('has a single slide for the all movies family', () => {
    expect(storySlides('films', three)).toEqual([
      { key: 'films-all', family: 'films', movie: null, index: 0 },
    ]);
  });

  it('has one slide per movie for the other families', () => {
    const slides = storySlides('ratings', three);
    expect(slides).toHaveLength(3);
    expect(slides[1]).toEqual({
      key: `ratings-${three[1]!.id}`,
      family: 'ratings',
      movie: three[1],
      index: 1,
    });
  });
});

describe('storyFileName', () => {
  it('names the file after the family and the position of the movie', () => {
    expect(
      storyFileName('4tdCIJeojN', { key: 'films-all', family: 'films', movie: null, index: 0 })
    ).toBe('movie-picker-story-4tdCIJeojN-films.jpg');
    expect(
      storyFileName('4tdCIJeojN', { key: 'film-1', family: 'film', movie: three[1]!, index: 1 })
    ).toBe('movie-picker-story-4tdCIJeojN-film-2.jpg');
    expect(
      storyFileName('4tdCIJeojN', {
        key: 'ratings-2',
        family: 'ratings',
        movie: three[2]!,
        index: 2,
      })
    ).toBe('movie-picker-story-4tdCIJeojN-notes-3.jpg');
  });
});
