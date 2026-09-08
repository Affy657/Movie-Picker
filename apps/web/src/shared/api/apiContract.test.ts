import type { components, paths } from '@/shared/api/generated/openapiSchema';
import type { MyEventsListResponse, MyEventSummary } from '@/features/events/types';
import type {
  RemoveParticipantResponse,
  DeleteEventResponse,
} from '@/features/events/api/eventsApi';
import type {
  FollowListResponse,
  UserStats,
  PublicProfile,
} from '@/features/profile/api/profileApi';
import type { WatchlistResponse } from '@/features/watchlist/api/watchlistApi';
import type { NotificationInbox } from '@/features/notifications/api/notificationsApi';
import type { MovieSearchListResponse } from '@/features/movies/api/moviesApi';
import type { UserProfile } from '@/features/auth/types';
import type { EventConfigData } from '@/shared/types/event';
import type { WatchProviderOffer } from '@/shared/types/movie';

export type ApiSchemas = components['schemas'];

type UnknownServerFields<TFrontType, TSchema> = Exclude<keyof TFrontType, keyof TSchema>;

type ServedBy<TFrontType, TSchema> =
  UnknownServerFields<TFrontType, TSchema> extends never
    ? true
    : UnknownServerFields<TFrontType, TSchema>;

type ApiPath = keyof paths;

import { expect, it } from 'vitest';

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
  ServedBy<NotificationInbox, ApiSchemas['NotificationInboxResponse']>,
  ServedBy<MovieSearchListResponse, ApiSchemas['MovieSearchListResponse']>,
  ServedBy<EventConfigData, ApiSchemas['EventConfigResponse']>,
  ServedBy<WatchProviderOffer, ApiSchemas['WatchProviderOfferResponse']>,
] = [true, true, true, true, true, true, true, true, true, true, true, true, true];

const endpointsCalledByTheFront: ApiPath[] = [
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/auth/me/export',
  '/api/v1/auth/me/password',
  '/api/v1/auth/me/identities/{provider}',
  '/api/v1/auth/oauth/providers',
  '/api/v1/auth/oauth/{provider}/start',
  '/api/v1/auth/password-reset/request',
  '/api/v1/auth/password-reset/confirm',
  '/api/v1/events',
  '/api/v1/events/mine',
  '/api/v1/events/slug/{idOrSlug}',
  '/api/v1/events/{idOrSlug}',
  '/api/v1/events/{idOrSlug}/close',
  '/api/v1/events/{idOrSlug}/config',
  '/api/v1/events/{idOrSlug}/invitations',
  '/api/v1/events/{idOrSlug}/invitations/eligible-follows',
  '/api/v1/events/{idOrSlug}/join',
  '/api/v1/events/{idOrSlug}/movies',
  '/api/v1/events/{idOrSlug}/movies/{movieId}',
  '/api/v1/events/{idOrSlug}/movies/{movieId}/note',
  '/api/v1/events/{idOrSlug}/movies/{movieId}/seen',
  '/api/v1/events/{idOrSlug}/movies/{movieId}/vote',
  '/api/v1/events/{idOrSlug}/movies/{movieId}/wheel-exclusion',
  '/api/v1/events/{idOrSlug}/participants/{participantId}',
  '/api/v1/events/{idOrSlug}/wheel',
  '/api/v1/events/{idOrSlug}/winner',
  '/api/v1/idea-suggestions',
  '/api/v1/letterboxd/confirm',
  '/api/v1/letterboxd/sync',
  '/api/v1/movies/collections',
  '/api/v1/movies/search',
  '/api/v1/movies/showcase',
  '/api/v1/movies/tmdb/{tmdbId}/details',
  '/api/v1/notifications/inbox',
  '/api/v1/notifications/inbox/read-all',
  '/api/v1/notifications/inbox/{id}/read',
  '/api/v1/notifications/preferences',
  '/api/v1/notifications/subscriptions',
  '/api/v1/notifications/vapid-public-key',
  '/api/v1/users/handle-available',
  '/api/v1/users/me/following-watched-movies',
  '/api/v1/users/me/watched-movies',
  '/api/v1/users/{handle}',
  '/api/v1/users/{handle}/follow',
  '/api/v1/users/{handle}/followers',
  '/api/v1/users/{handle}/following',
  '/api/v1/users/{handle}/movies',
  '/api/v1/users/{handle}/stats',
  '/api/v1/users/{handle}/watched-movies',
  '/api/v1/watchlist',
  '/api/v1/watchlist/{tmdbId}',
];

it('expose des types front alignés sur le contrat OpenAPI', () => {
  expect(frontTypesMatchTheOpenApiContract.every(Boolean)).toBe(true);
});

it('ne référence chaque route du contrat qu une seule fois (leur existence est vérifiée par le typage)', () => {
  expect(endpointsCalledByTheFront.length).toBeGreaterThan(0);
  expect(new Set(endpointsCalledByTheFront).size).toBe(endpointsCalledByTheFront.length);
});
