import type { ApiSchemas } from '@/shared/api/contract';

type EventMovie = ApiSchemas['MovieWithScoreResponse'];

const MOVIE_STAMP = '2026-01-01T00:00:00Z';

export function buildEventMovie(
  movie: Pick<EventMovie, '_id' | 'title'> & Partial<EventMovie>
): EventMovie {
  return {
    eventId: 'e1',
    participantId: 'p1',
    tmdbId: 1,
    mediaType: 'movie',
    year: '',
    posterPath: null,
    pitchNote: null,
    genreIds: [],
    excludedFromWheel: false,
    createdAt: MOVIE_STAMP,
    updatedAt: MOVIE_STAMP,
    proposerPseudo: '',
    proposerHandle: null,
    score: 0,
    up: 0,
    down: 0,
    myVote: null,
    seenCount: 0,
    seenByPseudos: [],
    votersUpPseudos: [],
    ratings: [],
    voteAverage: null,
    watchProviders: [],
    tmdbWatchPageUrl: null,
    runtimeMinutes: null,
    releaseDate: null,
    ...movie,
  };
}
