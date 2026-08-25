import type { AccentColor, RatingScale, UiThemePreference } from '@/shared/types/theme';

export interface UserProfile {
  userId: string;
  displayName: string;
  emailMasked: string;
  uiTheme: UiThemePreference;
  accentColor: AccentColor;
  ratingScale: RatingScale;
  avatarId: string;
  handle: string;
  bio: string | null;
  isProfilePublic: boolean;
  letterboxdUsername: string | null;
  letterboxdLastSyncAt: string | null;
  letterboxdLastSyncError: string | null;
  letterboxdPendingReconciliationCount: number;
  hasPassword: boolean;
  linkedProviders: string[];
  createdAt?: string;
}
