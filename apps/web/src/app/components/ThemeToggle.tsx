import clsx from 'clsx';
import { useMemo } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import type { UiThemePreference } from '@/shared/types/theme';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { isUiThemePreference } from '@/shared/utils/uiThemePreference';
import styles from './ThemeToggle.module.css';

const THEME_OPTIONS: readonly UiThemePreference[] = ['system', 'light', 'dark'];

const LABEL_KEY: Record<UiThemePreference, TranslationKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
};

export default function ThemeToggle({ className = '', id }: { className?: string; id?: string }) {
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

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    const last = options.length - 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(options[idx === last ? 0 : idx + 1]!.value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(options[idx === 0 ? last : idx - 1]!.value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(options[0]!.value);
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(options[last]!.value);
    }
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={id ? undefined : t('auth.account.themeLabel')}
      className={clsx(styles.root, className || undefined)}
    >
      {options.map((opt, idx) => {
        const selected = opt.value === preference;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={clsx(styles.option, selected && styles.optionSelected)}
            onClick={() => commit(opt.value)}
            onKeyDown={(e) => handleKey(e, idx)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
