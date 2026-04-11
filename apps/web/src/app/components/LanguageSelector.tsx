import clsx from 'clsx';
import {
  useLocale,
  useTranslation,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  isLocaleCode,
} from '@/shared/i18n';
import styles from './LanguageSelector.module.css';

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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (isLocaleCode(value)) setLocale(value);
  };

  return (
    <select
      id={id}
      className={clsx('btn', styles.root, className)}
      value={locale}
      onChange={handleChange}
      aria-label={id ? undefined : t('common.languageLabel')}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code}>
          {LOCALE_LABELS[code]}
        </option>
      ))}
    </select>
  );
}
