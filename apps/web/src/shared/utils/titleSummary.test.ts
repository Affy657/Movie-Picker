import { describe, expect, it } from 'vitest';
import { toAddTitleBody, toTitleSummary } from './titleSummary';

const DUNE = {
  tmdbId: 438631,
  mediaType: 'movie' as const,
  title: 'Dune',
  year: '2021',
  posterPath: '/dune.jpg',
  genreIds: [878, 12],
  voteAverage: 7.8,
  runtimeMinutes: 155,
};

describe('toTitleSummary', () => {
  it('keeps the eight fields of a title and drops the rest', () => {
    const watchlistEntry = { ...DUNE, createdAt: '2026-01-01T00:00:00Z', onLetterboxd: true };
    expect(toTitleSummary(watchlistEntry)).toEqual(DUNE);
  });

  it('reads the TMDB id of a catalog title under id', () => {
    const { tmdbId, ...rest } = DUNE;
    expect(toTitleSummary({ ...rest, id: tmdbId })).toEqual(DUNE);
  });

  it('takes a title without media type for a film', () => {
    expect(toTitleSummary({ ...DUNE, mediaType: undefined }).mediaType).toBe('movie');
  });
});

describe('toAddTitleBody', () => {
  it('leaves an unknown media type to the API', () => {
    const { tmdbId, ...rest } = DUNE;
    expect(toAddTitleBody({ ...rest, id: tmdbId, mediaType: undefined })).toEqual({
      ...DUNE,
      mediaType: undefined,
    });
  });

  it('keeps the genres, so a title added from a search stays under its genre filters', () => {
    const { tmdbId, ...rest } = DUNE;
    expect(toAddTitleBody({ ...rest, id: tmdbId }).genreIds).toEqual([878, 12]);
  });
});
