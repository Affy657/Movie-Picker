import { expect, it } from 'vitest';
import type { ApiSchemas } from '@/shared/api/contract';
import { apiPath, fetchApi } from '@/shared/api/client';
import type { RawEventData, RawMovieData, RawParticipantData } from '@/shared/api/apiMapping';
import type { EventConfigData, EventData } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import type { MarkWatchedBody } from '@/features/library/api/watchedApi';
import type { LetterboxdWatchedSelection } from '@/features/letterboxd/api/letterboxdApi';

type UnknownServerFields<TFrontType, TSchema> = Exclude<keyof TFrontType, keyof TSchema>;

type ServedBy<TFrontType, TSchema> =
  UnknownServerFields<TFrontType, TSchema> extends never
    ? true
    : UnknownServerFields<TFrontType, TSchema>;

const frontTypesMatchTheOpenApiContract: [
  ServedBy<RawEventData, ApiSchemas['EventDetailResponse']>,
  ServedBy<Omit<EventData, 'id'>, ApiSchemas['EventDetailResponse']>,
  ServedBy<EventConfigData, ApiSchemas['EventConfigResponse']>,
  ServedBy<RawMovieData, ApiSchemas['MovieWithScoreResponse']>,
  ServedBy<Omit<MovieData, 'id' | 'pendingVote'>, ApiSchemas['MovieWithScoreResponse']>,
  ServedBy<RawParticipantData, ApiSchemas['ParticipantResponse']>,
  ServedBy<MarkWatchedBody, ApiSchemas['MarkWatchedRequest']>,
  ServedBy<LetterboxdWatchedSelection, ApiSchemas['LetterboxdWatchedSelectionRequest']>,
] = [true, true, true, true, true, true, true, true];

it('exposes front types aligned with the OpenAPI contract', () => {
  expect(frontTypesMatchTheOpenApiContract.every(Boolean)).toBe(true);
});

it('refuses at compile time a route the contract does not serve', () => {
  const callsThatMustNotCompile = [
    // @ts-expect-error not in the contract
    () => apiPath('no-such-route'),
    // @ts-expect-error not in the contract
    () => apiPath('events', 'soiree', 'no-such-route'),
    // @ts-expect-error not in the contract
    () => apiPath('users', 'alice', 'no-such-route'),
    // @ts-expect-error not in the contract
    () => fetchApi('/no-such-route'),
    // @ts-expect-error not in the contract
    () => fetchApi('/auth/no-such-route'),
  ];

  expect(callsThatMustNotCompile).toHaveLength(5);
});

it('accepts a contract route, its parameters and its query string', () => {
  expect(apiPath('events', 'soiree', 'movies', 'm1', 'vote')).toBe('/events/soiree/movies/m1/vote');
  expect(apiPath('recaps', 'r1')).toBe('/recaps/r1');
  expect(apiPath('watchlist', 603)).toBe('/watchlist/603');
  const callsThatMustCompile = [
    () => fetchApi('/auth/me'),
    () => fetchApi('/events/mine?scope=active'),
    () => fetchApi(apiPath('events', 'soiree', 'wheel', 'announce')),
    () => fetchApi(`${apiPath('watchlist', 603)}?mediaType=movie`),
  ];

  expect(callsThatMustCompile).toHaveLength(4);
});
