import { expect, it } from 'vitest';
import type { components } from '@/shared/api/generated/openapiSchema';
import { apiPath, fetchApi } from '@/shared/api/client';
import type { RawEventData, RawMovieData, RawParticipantData } from '@/shared/api/apiMapping';
import type {
  EventTemplateData,
  MyEventsListResponse,
  MyEventSummary,
} from '@/features/events/types';
import type {
  RawNightRecap,
  RawWinnerMovie,
  RemoveParticipantResponse,
  DeleteEventResponse,
} from '@/features/events/api/eventsApi';
import type {
  FavoriteListResponse,
  FollowListResponse,
  PublicProfile,
} from '@/features/profile/api/profileApi';
import type { UserStats } from '@/features/events/api/userStatsApi';
import type {
  WatchlistAvailabilityItem,
  WatchlistAvailabilityResponse,
  WatchlistResponse,
} from '@/features/movies/api/watchlistApi';
import type {
  NotificationInbox,
  NotificationUnreadCount,
} from '@/features/notifications/api/notificationsApi';
import type { MovieSearchListResponse } from '@/features/movies/api/moviesApi';
import type { UserProfile } from '@/features/auth/types';
import type { EventConfigData } from '@/shared/types/event';
import type { FavoriteTitle, MovieRating, WatchProviderOffer } from '@/shared/types/movie';
import type { UserWatchedMovieItem } from '@/features/profile/api/profileApi';

export type ApiSchemas = components['schemas'];

type UnknownServerFields<TFrontType, TSchema> = Exclude<keyof TFrontType, keyof TSchema>;

type ServedBy<TFrontType, TSchema> =
  UnknownServerFields<TFrontType, TSchema> extends never
    ? true
    : UnknownServerFields<TFrontType, TSchema>;

const frontTypesMatchTheOpenApiContract: [
  ServedBy<MyEventsListResponse, ApiSchemas['MyEventsListResponse']>,
  ServedBy<MyEventSummary, ApiSchemas['MyEventSummaryDto']>,
  ServedBy<RemoveParticipantResponse, ApiSchemas['RemoveParticipantResponse']>,
  ServedBy<DeleteEventResponse, ApiSchemas['DeleteEventResponse']>,
  ServedBy<FollowListResponse, ApiSchemas['FollowListResponse']>,
  ServedBy<UserStats, ApiSchemas['UserStatsResponse']>,
  ServedBy<PublicProfile, ApiSchemas['PublicProfileResponse']>,
  ServedBy<UserProfile, ApiSchemas['UserProfileResponse']>,
  ServedBy<WatchlistResponse, ApiSchemas['WatchlistResponse']>,
  ServedBy<WatchlistAvailabilityResponse, ApiSchemas['WatchlistAvailabilityResponse']>,
  ServedBy<WatchlistAvailabilityItem, ApiSchemas['WatchlistAvailabilityItemResponse']>,
  ServedBy<NotificationInbox, ApiSchemas['NotificationInboxResponse']>,
  ServedBy<NotificationUnreadCount, ApiSchemas['NotificationUnreadCountResponse']>,
  ServedBy<MovieSearchListResponse, ApiSchemas['MovieSearchListResponse']>,
  ServedBy<EventConfigData, ApiSchemas['EventConfigResponse']>,
  ServedBy<WatchProviderOffer, ApiSchemas['WatchProviderOfferResponse']>,
  ServedBy<MovieRating, ApiSchemas['MovieRatingResponse']>,
  ServedBy<UserWatchedMovieItem, ApiSchemas['UserWatchedMovieItem']>,
  ServedBy<FavoriteTitle, ApiSchemas['FavoriteTitleResponse']>,
  ServedBy<FavoriteListResponse, ApiSchemas['FavoriteListResponse']>,
  ServedBy<RawEventData, ApiSchemas['EventDetailResponse']>,
  ServedBy<RawMovieData, ApiSchemas['MovieWithScoreResponse']>,
  ServedBy<RawParticipantData, ApiSchemas['ParticipantResponse']>,
  ServedBy<RawNightRecap, ApiSchemas['NightRecapResponse']>,
  ServedBy<RawWinnerMovie, ApiSchemas['WinnerMovieResponse']>,
  ServedBy<EventTemplateData, ApiSchemas['EventTemplateResponse']>,
] = [
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
];

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
