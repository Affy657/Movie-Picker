import type { UserProfile } from '@/features/auth/types';

export function buildUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: 'u1',
    displayName: 'Léa',
    emailMasked: 'l***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
    ratingScale: 'five',
    avatarId: 'bolt',
    avatarPhotoId: null,
    generatedAvatarId: 'bolt',
    handle: 'lea',
    bio: null,
    isProfilePublic: true,
    isWatchlistPublic: true,
    letterboxdUsername: null,
    letterboxdLastSyncAt: null,
    letterboxdLastSyncError: null,
    letterboxdPendingReconciliationCount: 0,
    hasPassword: true,
    linkedProviders: [],
    ...overrides,
  };
}
