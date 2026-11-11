import { useState } from 'react';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import type { UiThemePreference } from '@/shared/types/theme';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { isUiThemePreference } from '@/shared/utils/uiThemePreference';

export const THEME_OPTIONS: readonly UiThemePreference[] = ['system', 'light', 'dark'];

export const THEME_LABEL_KEY: Record<UiThemePreference, TranslationKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
};

export const THEME_ICON: Record<UiThemePreference, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function useUiThemeChoice(onSaved?: () => void) {
  const { preference, setUiPreference } = useTheme();
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const commit = (value: UiThemePreference) => {
    if (!isUiThemePreference(value)) return;
    const prev = preference;
    setError(null);
    setUiPreference(value);
    if (user) {
      void patchProfile({ uiTheme: value })
        .then(() => onSaved?.())
        .catch(() => {
          setUiPreference(prev);
          setError(
            t('auth.account.themeSaveError', {
              theme: t(THEME_LABEL_KEY[value]),
              previous: t(THEME_LABEL_KEY[prev]),
            })
          );
        });
    }
  };

  return { preference, commit, error };
}
