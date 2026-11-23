import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageSuggestion, { shouldSuggestEnglish } from '@/app/components/LanguageSuggestion';
import { LocaleProvider } from '@/shared/i18n';

const BROWSER = {
  languages: ['en-US', 'en'],
  storedLocale: null,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Safari/605.1.15',
  webdriver: false,
};

describe('shouldSuggestEnglish', () => {
  it('suggests English to a browser that asks for no French, before any choice', () => {
    expect(shouldSuggestEnglish(BROWSER)).toBe(true);
  });

  it('stays quiet for a browser that reads French in any variant', () => {
    expect(shouldSuggestEnglish({ ...BROWSER, languages: ['en-GB', 'fr-CA'] })).toBe(false);
  });

  it('stays quiet once a language was chosen', () => {
    expect(shouldSuggestEnglish({ ...BROWSER, storedLocale: 'fr' })).toBe(false);
    expect(shouldSuggestEnglish({ ...BROWSER, storedLocale: 'en' })).toBe(false);
  });

  it('stays quiet for crawlers and automated browsers, so the French pages index as French', () => {
    expect(
      shouldSuggestEnglish({
        ...BROWSER,
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      })
    ).toBe(false);
    expect(shouldSuggestEnglish({ ...BROWSER, userAgent: 'Chrome-Lighthouse' })).toBe(false);
    expect(shouldSuggestEnglish({ ...BROWSER, webdriver: true })).toBe(false);
  });
});

function renderSuggestion() {
  return render(
    <LocaleProvider>
      <LanguageSuggestion browser={BROWSER} />
    </LocaleProvider>
  );
}

describe('LanguageSuggestion', () => {
  beforeEach(() => localStorage.removeItem('moviepicker-locale'));

  it('offers English in English, and switches the site when accepted', async () => {
    const user = userEvent.setup();
    renderSuggestion();

    expect(await screen.findByText('View Movie Picker in English?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch to English' }));

    expect(localStorage.getItem('moviepicker-locale')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(screen.queryByText('View Movie Picker in English?')).not.toBeInTheDocument();
  });

  it('keeps French for good when dismissed', async () => {
    const user = userEvent.setup();
    renderSuggestion();

    await screen.findByText('View Movie Picker in English?');
    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(localStorage.getItem('moviepicker-locale')).toBe('fr');
    expect(screen.queryByText('View Movie Picker in English?')).not.toBeInTheDocument();
  });
});
