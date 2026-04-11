import type { UiThemePreference } from '@/shared/types/theme';

/** Aligné sur `UserProfileResponse` (API .NET). */
export interface UserProfile {
  userId: string;
  displayName: string;
  emailMasked: string;
  uiTheme: UiThemePreference;
}
