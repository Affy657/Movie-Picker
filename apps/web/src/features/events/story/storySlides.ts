import type { TranslationKey } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';

export type StoryFamilyKey = 'films' | 'film' | 'ratings';

export type StoryFamily = {
  key: StoryFamilyKey;
  labelKey: TranslationKey;
};

export type StorySlide = {
  key: string;
  family: StoryFamilyKey;
  movie: MovieData | null;
  index: number;
};

const FILE_SEGMENT: Record<StoryFamilyKey, string> = {
  films: 'films',
  film: 'film',
  ratings: 'notes',
};

export function storyFamilies(winners: readonly MovieData[]): StoryFamily[] {
  const single = winners.length <= 1;
  const families: StoryFamily[] = [
    {
      key: 'film',
      labelKey: single ? 'events.recap.story.familyFilmOne' : 'events.recap.story.familyFilm',
    },
    { key: 'ratings', labelKey: 'events.recap.story.familyRatings' },
  ];
  if (single) return families;
  return [{ key: 'films', labelKey: 'events.recap.story.familyFilms' }, ...families];
}

export function storySlides(family: StoryFamilyKey, winners: readonly MovieData[]): StorySlide[] {
  if (family === 'films') return [{ key: `${family}-all`, family, movie: null, index: 0 }];
  return winners.map((movie, index) => ({
    key: `${family}-${movie.id}`,
    family,
    movie,
    index,
  }));
}

export function storyFileName(slug: string, slide: StorySlide): string {
  const segment = FILE_SEGMENT[slide.family];
  const position = slide.family === 'films' ? '' : `-${slide.index + 1}`;
  return `movie-picker-story-${slug}-${segment}${position}.jpg`;
}
