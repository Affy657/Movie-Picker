import { describe, expect, it } from 'vitest';
import { t as translate } from '@/shared/i18n';
import type { Translate } from '@/shared/i18n';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { storyImageSpec, type StorySpecInput } from './storySpec';

const fr: Translate = (key, vars) => translate(key, vars, 'fr');
const en: Translate = (key, vars) => translate(key, vars, 'en');

const movie = (
  id: string,
  title: string,
  ratings: Array<[string, number]>,
  posterPath: string | null = '/p.jpg'
): MovieData =>
  ({
    id,
    title,
    year: '2010',
    posterPath,
    ratings: ratings.map(([participantId, value]) => ({ participantId, value, updatedAt: '' })),
  }) as MovieData;

const participants = [
  { id: 'p1', pseudo: 'Clara', avatarId: 'alpha', isCreator: true },
  { id: 'p2', pseudo: 'Marius' },
  { id: 'p3', pseudo: 'Yann' },
];

const event = {
  slug: '4tdCIJeojN',
  title: 'Soirée du vendredi',
  date: '2026-09-18',
  time: '20:30',
  participantCount: 8,
  participants,
  config: { theme: 'Années 80' },
} as EventData;

const inception = movie('1', 'Inception', [
  ['p1', 10],
  ['p2', 9],
]);
const heat = movie('2', 'Heat', []);

const spec = (over: Partial<StorySpecInput> = {}) =>
  storyImageSpec({
    event,
    winners: [inception, heat],
    slide: { key: 'films-0', family: 'films', movie: null, index: 0 },
    scale: 'five',
    locale: 'fr',
    t: fr,
    recapUrl: 'https://www.movie-picker.fr/r/4tdCIJeojN',
    ...over,
  });

describe('storyImageSpec', () => {
  it('heads every story with the brand, the night and the recap link', () => {
    const s = spec();

    expect(s.brand).toBe('Movie Picker');
    expect(s.eyebrow).toBe('Le recap de la soirée');
    expect(s.title).toBe('Soirée du vendredi');
    expect(s.date).toBe('vendredi 18 septembre 2026 à 20h30');
    expect(s.qr).toEqual({
      value: 'https://www.movie-picker.fr/r/4tdCIJeojN',
      caption: 'Voir le recap',
    });
    expect(s.url).toBe('movie-picker.fr/r/4tdCIJeojN');
    expect(s.footer).toBe('Le recap et les notes de chacun');
  });

  it('lists every chosen movie with its average in the reader scale', () => {
    const s = spec();

    expect(s.layout).toBe('films');
    expect(s.films).toHaveLength(2);
    expect(s.films[0]).toMatchObject({
      title: 'Inception',
      year: '2010',
      ratingText: '4,8/5',
      countText: '2 notes',
    });
    expect(s.films[1]).toMatchObject({ title: 'Heat', ratingText: null, countText: null });
  });

  it('keeps a single movie when the slide isolates one', () => {
    const s = spec({ slide: { key: 'film-1', family: 'film', movie: heat, index: 1 } });

    expect(s.films.map((f) => f.title)).toEqual(['Heat']);
  });

  it('carries the participants and the theme of the night', () => {
    const s = spec();

    expect(s.people).toMatchObject({ label: '8 participants' });
    expect(s.people?.avatars).toHaveLength(3);
    expect(s.people?.avatars[0]).toMatchObject({ initials: 'CL' });
    expect(s.theme).toBe('Années 80');
  });

  it('writes the average on the ten scale when the reader uses it', () => {
    const s = spec({ scale: 'ten' });

    expect(s.films[0]?.ratingText).toBe('9,5/10');
  });

  it('speaks the language of the interface', () => {
    const s = spec({ locale: 'en', t: en });

    expect(s.eyebrow).toBe('The night recap');
    expect(s.date).toBe('Friday, 18 September 2026 at 20h30');
    expect(s.films[0]?.countText).toBe('2 ratings');
  });

  it('ranks the ratings of a movie, highest first, unrated participants last', () => {
    const s = spec({ slide: { key: 'ratings-0', family: 'ratings', movie: inception, index: 0 } });

    expect(s.layout).toBe('ratings');
    expect(s.films.map((f) => f.title)).toEqual(['Inception']);
    expect(s.rows.map((r) => [r.name, r.ratingText])).toEqual([
      ['Clara', '5,0/5'],
      ['Marius', '4,5/5'],
      ['Yann', null],
    ]);
    expect(s.rows[0]?.isHost).toBe(true);
    expect(s.rows[2]?.fallbackText).toBe('Pas encore noté');
  });

  it('caps the rating rows and counts the others', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: 'q' + i, pseudo: 'Ami ' + i }));
    const rated = movie(
      '3',
      'Matrix',
      many.slice(0, 10).map((p, i) => [p.id, 10 - i] as [string, number])
    );
    const s = spec({
      event: { ...event, participants: many, participantCount: 12 } as EventData,
      winners: [rated],
      slide: { key: 'ratings-0', family: 'ratings', movie: rated, index: 0 },
    });

    expect(s.rows).toHaveLength(8);
    expect(s.moreText).toBe('et 4 autres participants');
  });

  it('shows no more line when every participant fits', () => {
    const s = spec({ slide: { key: 'ratings-0', family: 'ratings', movie: inception, index: 0 } });

    expect(s.rows).toHaveLength(3);
    expect(s.moreText).toBeNull();
  });

  it('says when a movie has no rating at all', () => {
    const s = spec({ slide: { key: 'ratings-1', family: 'ratings', movie: heat, index: 1 } });

    expect(s.films[0]?.fallbackText).toBe('Pas encore de note');
    expect(s.films[0]?.ratingText).toBeNull();
  });

  it('has no poster to draw when the movie has none', () => {
    const s = spec({ winners: [movie('4', 'Sans affiche', [], null)] });

    expect(s.films[0]?.posterSrc).toBeNull();
  });
});
