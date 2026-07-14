import { useMemo } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import type { UiThemePreference } from '@/shared/types/theme';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { isUiThemePreference } from '@/shared/utils/uiThemePreference';
import SegmentedRadioGroup from './SegmentedRadioGroup';

const THEME_OPTIONS: readonly UiThemePreference[] = ['system', 'light', 'dark'];

const LABEL_KEY: Record<UiThemePreference, TranslationKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
};

export default function ThemeToggle({
  className = '',
  id,
}: Readonly<{ className?: string; id?: string }>) {
  const { preference, setUiPreference } = useTheme();
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      THEME_OPTIONS.map((code) => ({
        value: code,
        label: t(LABEL_KEY[code]),
      })),
    [t]
  );

  const commit = (value: UiThemePreference) => {
    if (!isUiThemePreference(value)) return;
    const prev = preference;
    setUiPreference(value);
    if (user) {
      void patchProfile({ uiTheme: value }).catch(() => {
        setUiPreference(prev);
      });
    }
  };

  return (
    <SegmentedRadioGroup
      options={options}
      value={preference}
      onChange={commit}
      ariaLabel={t('auth.account.themeLabel')}
      className={className}
      id={id}
    />
  );
}
