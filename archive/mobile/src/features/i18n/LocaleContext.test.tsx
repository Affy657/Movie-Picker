import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { LocaleProvider, useLocale, useTranslation } from './LocaleContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr' }],
}));

const AsyncStorage = require('@react-native-async-storage/async-storage') as {
  getItem: jest.Mock;
  setItem: jest.Mock;
};

beforeEach(() => {
  AsyncStorage.getItem.mockReset().mockResolvedValue(null);
  AsyncStorage.setItem.mockReset().mockResolvedValue(undefined);
});

function Probe() {
  const { locale, tmdbLanguage, isHydrating } = useLocale();
  return <Text>{`${locale}|${tmdbLanguage}|${isHydrating ? 'h' : 'r'}`}</Text>;
}

describe('LocaleProvider', () => {
  it('detects device locale (fr) when nothing stored', async () => {
    const { findByText } = render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );
    await findByText('fr|fr-FR|r');
  });

  it('uses stored locale when valid', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('en');
    const { findByText } = render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );
    await findByText('en|en-US|r');
  });

  it('ignores invalid stored locale', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('xx');
    const { findByText } = render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );
    await findByText('fr|fr-FR|r');
  });

  it('setLocale persists the new locale', async () => {
    let setLocale: ((c: 'fr' | 'en') => void) | null = null;
    function Capture() {
      const ctx = useLocale();
      setLocale = ctx.setLocale;
      return <Text>{ctx.locale}</Text>;
    }
    const { findByText } = render(
      <LocaleProvider>
        <Capture />
      </LocaleProvider>
    );
    await findByText('fr');

    act(() => setLocale?.('en'));

    await findByText('en');
    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('moviepicker-locale', 'en')
    );
  });

  it('useTranslation returns a t() bound to current locale', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('en');
    function Probe2() {
      const { t, locale } = useTranslation();
      return <Text>{`${locale}:${typeof t === 'function'}`}</Text>;
    }
    const { findByText } = render(
      <LocaleProvider>
        <Probe2 />
      </LocaleProvider>
    );
    await findByText('en:true');
  });
});
