import type { AccentColor, UiThemePreference } from '@/shared/types/theme';

export interface UserProfile {
  userId: string;
  displayName: string;
  emailMasked: string;
  uiTheme: UiThemePreference;
  accentColor: AccentColor;
  avatarId: string;
  handle: string;
  bio: string | null;
  isProfilePublic: boolean;
}
