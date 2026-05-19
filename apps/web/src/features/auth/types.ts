import type { AccentColor, UiThemePreference } from '@/shared/types/theme';

export interface UserProfile {
  userId: string;
  displayName: string;
  emailMasked: string;
  uiTheme: UiThemePreference;
  accentColor: AccentColor;
}
