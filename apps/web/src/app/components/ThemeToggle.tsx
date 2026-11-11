import { useMemo } from 'react';
import { useTranslation } from '@/shared/i18n';
import SegmentedRadioGroup, { type SegmentedSize } from '@/shared/components/SegmentedRadioGroup';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { THEME_ICON, THEME_LABEL_KEY, THEME_OPTIONS, useUiThemeChoice } from './useUiThemeChoice';

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
  const { t } = useTranslation();
  const { preference, commit, error } = useUiThemeChoice(onSaved);

  const options = useMemo(
    () =>
      THEME_OPTIONS.map((code) => {
        const Icon = THEME_ICON[code];
        return {
          value: code,
          label: t(THEME_LABEL_KEY[code]),
          icon: iconOnly ? (
            <Icon size={ICON_SIZE.md} strokeWidth={2} aria-hidden focusable={false} />
          ) : null,
        };
      }),
    [t, iconOnly]
  );

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
