import type { AccentColor, RatingScale, UiThemePreference } from '@/shared/types/theme';
import type { FavoriteTitle } from '@/shared/types/movie';

export interface UserProfile {
  userId: string;
  displayName: string;
  emailMasked: string;
  email?: string;
  uiTheme: UiThemePreference;
  accentColor: AccentColor;
  ratingScale: RatingScale;
  dimWatched?: boolean;
  avatarId: string;
  avatarPhotoId?: string | null;
  generatedAvatarId?: string | null;
  handle: string;
  bio: string | null;
  isProfilePublic: boolean;
  isWatchlistPublic: boolean;
  isWatchedPublic?: boolean;
  letterboxdUsername: string | null;
  letterboxdLastSyncAt: string | null;
  letterboxdLastSyncError: string | null;
  letterboxdPendingReconciliationCount: number;
  letterboxdSyncWatchlist?: boolean;
  letterboxdSyncWatched?: boolean;
  letterboxdWatchlistCount?: number;
  letterboxdWatchedCount?: number;
  hasPassword: boolean;
  linkedProviders: string[];
  favorites?: FavoriteTitle[];
  createdAt?: string;
}
