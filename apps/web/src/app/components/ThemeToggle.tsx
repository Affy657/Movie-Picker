import clsx from 'clsx';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import type { UiThemePreference } from '@/shared/types/theme';
import { useTranslation } from '@/shared/i18n';
import { isUiThemePreference } from '@/shared/utils/uiThemePreference';
import styles from './ThemeToggle.module.css';

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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
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
    <select
      id={id}
      className={clsx('btn', styles.root, className)}
      value={preference}
      onChange={handleChange}
      aria-label={id ? undefined : t('auth.account.themeLabel')}
    >
      {THEME_OPTIONS.map((code) => (
        <option key={code} value={code}>
          {code === 'light'
            ? t('theme.light')
            : code === 'dark'
              ? t('theme.dark')
              : t('theme.system')}
        </option>
      ))}
    </select>
  );
}
