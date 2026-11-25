import type { ApiSchemas } from '@/shared/api/contract';

type PublicProfile = ApiSchemas['PublicProfileResponse'];

export function buildPublicProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    handle: 'alice',
    displayName: 'Alice',
    avatarId: 'alpha',
    bio: null,
    memberSince: '2024-03-15T00:00:00Z',
    followingCount: 0,
    followersCount: 0,
    isSupporter: false,
    isFollowedByMe: null,
    isWatchlistPublic: true,
    watchlistCount: 0,
    isWatchedPublic: true,
    favorites: [],
    banner: null,
    accentColor: 'default',
    ...overrides,
  };
}
