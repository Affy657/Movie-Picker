import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/shared/i18n';

export default function LocaleQuerySync() {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const answeredIn = useRef(locale);

  useEffect(() => {
    if (answeredIn.current === locale) return;
    answeredIn.current = locale;
    void queryClient.invalidateQueries();
  }, [locale, queryClient]);

  return null;
}
