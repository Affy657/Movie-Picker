import clsx from 'clsx';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useTranslation } from '@/shared/i18n';
import { getNextUiPreference } from '@/shared/utils/uiThemePreference';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle({
  className = '',
  id,
}: {
  className?: string;
  /** Si défini, le libellé visible doit utiliser `htmlFor={id}` ; sinon `aria-label` dynamique seul. */
  id?: string;
}) {
  const { preference, resolvedTheme, setUiPreference } = useTheme();
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();

  const label =
    preference === 'system'
      ? `Auto (${resolvedTheme === 'dark' ? t('theme.dark') : t('theme.light')})`
      : preference === 'dark'
        ? t('theme.dark')
        : t('theme.light');

  const handleClick = () => {
    const prev = preference;
    const next = getNextUiPreference(prev);
    setUiPreference(next);
    if (user) {
      void patchProfile({ uiTheme: next }).catch(() => {
        setUiPreference(prev);
      });
    }
  };

  return (
    <button
      type="button"
      id={id}
      className={clsx('btn', styles.root, className)}
      onClick={handleClick}
      aria-label={id ? undefined : label}
    >
      {label}
    </button>
  );
}
