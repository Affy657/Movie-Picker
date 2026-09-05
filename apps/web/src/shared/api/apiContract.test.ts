import type { components } from '@/shared/api/generated/openapiSchema';
import type { MyEventsListResponse } from '@/features/events/types';
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

export type ApiSchemas = components['schemas'];

type UnknownServerFields<TFrontType, TSchema> = Exclude<keyof TFrontType, keyof TSchema>;

type ServedBy<TFrontType, TSchema> =
  UnknownServerFields<TFrontType, TSchema> extends never
    ? true
    : UnknownServerFields<TFrontType, TSchema>;

import { expect, it } from 'vitest';

const frontTypesMatchTheOpenApiContract: [
  ServedBy<MyEventsListResponse, ApiSchemas['MyEventsListResponse']>,
  ServedBy<RemoveParticipantResponse, ApiSchemas['RemoveParticipantResponse']>,
  ServedBy<DeleteEventResponse, ApiSchemas['DeleteEventResponse']>,
  ServedBy<FollowListResponse, ApiSchemas['FollowListResponse']>,
  ServedBy<UserStats, ApiSchemas['UserStatsResponse']>,
  ServedBy<PublicProfile, ApiSchemas['PublicProfileResponse']>,
  ServedBy<UserProfile, ApiSchemas['UserProfileResponse']>,
  ServedBy<WatchlistResponse, ApiSchemas['WatchlistResponse']>,
  ServedBy<NotificationInbox, ApiSchemas['NotificationInboxResponse']>,
  ServedBy<MovieSearchListResponse, ApiSchemas['MovieSearchListResponse']>,
] = [true, true, true, true, true, true, true, true, true, true];

it('expose des types front alignés sur le contrat OpenAPI', () => {
  expect(frontTypesMatchTheOpenApiContract.every(Boolean)).toBe(true);
});
