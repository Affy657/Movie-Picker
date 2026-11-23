import { useMemo } from 'react';
import { useTranslation, type LocaleCode } from '@/shared/i18n';

const LOCALE_TAG: Record<LocaleCode, string> = { fr: 'fr-FR', en: 'en-GB' };

export type TechFormat = {
  number: (value: number) => string;
  date: (isoDate: string) => string;
};

export function techFormat(locale: LocaleCode): TechFormat {
  const numbers = new Intl.NumberFormat(LOCALE_TAG[locale]);
  const dates = new Intl.DateTimeFormat(LOCALE_TAG[locale], { dateStyle: 'long', timeZone: 'UTC' });
  return {
    number: (value) => numbers.format(value),
    date: (isoDate) => dates.format(new Date(`${isoDate}T12:00:00Z`)),
  };
}

export function useTechFormat(): TechFormat {
  const { locale } = useTranslation();
  return useMemo(() => techFormat(locale), [locale]);
}
