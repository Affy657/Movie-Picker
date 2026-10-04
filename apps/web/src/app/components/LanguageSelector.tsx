import { useMemo } from 'react';
import Dropdown, { type DropdownPlacement } from '@/shared/components/Dropdown';
import {
  useLocale,
  useTranslation,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  isLocaleCode,
} from '@/shared/i18n';

export default function LanguageSelector({
  className = '',
  id,
  ariaLabelledBy,
  inline = false,
  placement,
}: Readonly<{
  className?: string;
  id?: string;
  ariaLabelledBy?: string;
  inline?: boolean;
  placement?: DropdownPlacement;
}>) {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      SUPPORTED_LOCALES.map((code) => ({
        value: code,
        label: LOCALE_LABELS[code],
      })),
    []
  );

  const naming = ariaLabelledBy ? { ariaLabelledBy } : { ariaLabel: t('common.languageLabel') };

  return (
    <Dropdown
      {...naming}
      id={id}
      value={locale}
      options={options}
      onChange={(v) => {
        if (isLocaleCode(v)) setLocale(v);
      }}
      className={className || undefined}
      inline={inline}
      placement={placement}
    />
  );
}
