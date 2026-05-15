import { useMemo } from 'react';
import Dropdown from '@/shared/components/Dropdown';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import type { UiThemePreference } from '@/shared/types/theme';
import { useTranslation } from '@/shared/i18n';
import { isUiThemePreference } from '@/shared/utils/uiThemePreference';

const THEME_OPTIONS: readonly UiThemePreference[] = ['light', 'dark', 'system'];

export default function ThemeToggle({
  className = '',
  id,
}: {
  className?: string;
  /** Si défini, le libellé visible doit utiliser `htmlFor={id}` ; sinon `aria-label` seul. */
  id?: string;
}) {
  const { preference, setUiPreference } = useTheme();
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      THEME_OPTIONS.map((code) => ({
        value: code,
        label:
          code === 'light'
            ? t('theme.light')
            : code === 'dark'
              ? t('theme.dark')
              : t('theme.system'),
      })),
    [t]
  );

  const handleChange = (value: string) => {
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
    <Dropdown
      id={id}
      value={preference}
      options={options}
      onChange={handleChange}
      ariaLabel={id ? undefined : t('auth.account.themeLabel')}
      className={className || undefined}
    />
  );
}
