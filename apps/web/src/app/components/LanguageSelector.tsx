import { useMemo } from 'react';
import Dropdown from '@/shared/components/Dropdown';
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
}: {
  className?: string;
  /** Si défini, le libellé visible doit utiliser `htmlFor={id}` ; sinon `aria-label` seule. */
  id?: string;
}) {
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

  return (
    <Dropdown
      id={id}
      value={locale}
      options={options}
      onChange={(v) => {
        if (isLocaleCode(v)) setLocale(v);
      }}
      ariaLabel={id ? undefined : t('common.languageLabel')}
      className={className || undefined}
    />
  );
}
