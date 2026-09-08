import { useMemo, useState } from 'react';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import type { UiThemePreference } from '@/shared/types/theme';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { isUiThemePreference } from '@/shared/utils/uiThemePreference';
import SegmentedRadioGroup, { type SegmentedSize } from './SegmentedRadioGroup';

const THEME_OPTIONS: readonly UiThemePreference[] = ['system', 'light', 'dark'];

const LABEL_KEY: Record<UiThemePreference, TranslationKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
};

const ICON: Record<UiThemePreference, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export default function ThemeToggle({
  className = '',
  id,
  ariaLabelledBy,
  onSaved,
  size = 'md',
  iconOnly = false,
}: Readonly<{
  className?: string;
  id?: string;
  ariaLabelledBy?: string;
  onSaved?: () => void;
  size?: SegmentedSize;
  iconOnly?: boolean;
}>) {
  const { preference, setUiPreference } = useTheme();
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      THEME_OPTIONS.map((code) => {
        const Icon = ICON[code];
        return {
          value: code,
          label: t(LABEL_KEY[code]),
          icon: iconOnly ? <Icon size={16} strokeWidth={2} aria-hidden focusable={false} /> : null,
        };
      }),
    [t, iconOnly]
  );

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
              theme: t(LABEL_KEY[value]),
              previous: t(LABEL_KEY[prev]),
            })
          );
        });
    }
  };

  return (
    <>
      <SegmentedRadioGroup
        options={options}
        value={preference}
        onChange={commit}
        ariaLabel={t('auth.account.themeLabel')}
        ariaLabelledBy={ariaLabelledBy}
        className={className}
        id={id}
        size={size}
        iconOnly={iconOnly}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
