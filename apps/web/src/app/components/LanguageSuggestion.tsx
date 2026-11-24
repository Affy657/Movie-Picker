import { useEffect, useState } from 'react';
import Button from '@/shared/components/Button';
import Notice from '@/shared/components/Notice';
import { loadLocale, t, useLocale } from '@/shared/i18n';
import { safeLocalStorageGet } from '@/shared/utils/safeStorage';

const LOCALE_STORAGE_KEY = 'moviepicker-locale';
const AUTOMATED_AGENT = /bot|crawl|spider|slurp|lighthouse|headless|preview/i;

export interface BrowserLanguageContext {
  languages: ReadonlyArray<string>;
  storedLocale: string | null;
  userAgent: string;
  webdriver: boolean;
}

export function shouldSuggestEnglish(browser: BrowserLanguageContext): boolean {
  if (browser.storedLocale !== null) return false;
  if (browser.webdriver || AUTOMATED_AGENT.test(browser.userAgent)) return false;
  return !browser.languages.some((language) => language.toLowerCase().startsWith('fr'));
}

function currentBrowser(): BrowserLanguageContext {
  return {
    languages: navigator.languages?.length ? navigator.languages : [navigator.language],
    storedLocale: safeLocalStorageGet(LOCALE_STORAGE_KEY),
    userAgent: navigator.userAgent,
    webdriver: navigator.webdriver === true,
  };
}

export default function LanguageSuggestion({
  browser,
}: Readonly<{ browser?: BrowserLanguageContext }>) {
  const { locale, setLocale } = useLocale();
  const [englishReady, setEnglishReady] = useState(false);
  const [suggested] = useState(() => shouldSuggestEnglish(browser ?? currentBrowser()));
  const [answered, setAnswered] = useState(false);
  const visible = suggested && !answered && locale === 'fr';

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    loadLocale('en')
      .then(() => {
        if (!cancelled) setEnglishReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible || !englishReady) return null;

  const answer = (code: 'fr' | 'en') => {
    setAnswered(true);
    setLocale(code);
  };

  return (
    <div lang="en" data-nosnippet="">
      <Notice
        title={t('languageSuggestion.title', undefined, 'en')}
        description={t('languageSuggestion.description', undefined, 'en')}
        placement="top"
        onClose={() => answer('fr')}
        closeAriaLabel={t('common.close', undefined, 'en')}
      >
        <Button type="button" size="sm" variant="primary" onClick={() => answer('en')}>
          {t('languageSuggestion.switch', undefined, 'en')}
        </Button>
      </Notice>
    </div>
  );
}
