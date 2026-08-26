import { describe, it, expect } from 'vitest';
import { buildSystemBrowserOpenUrl, isKnownInAppBrowser } from '@/shared/utils/inAppBrowser';

const CASES: Array<[string, string, boolean]> = [
  [
    'Snapchat',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.71.0.34',
    true,
  ],
  [
    'Instagram',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 302.0.0.23.114',
    true,
  ],
  [
    'TikTok',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_2024051012',
    true,
  ],
  [
    'Facebook iOS',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 [FBAN/FBIOS;FBDV/iPhone15,2]',
    true,
  ],
  [
    'WhatsApp',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.20.0',
    true,
  ],
  [
    'iOS WKWebView sans nom d’app',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    true,
  ],
  [
    'Safari iOS',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    false,
  ],
  [
    'Chrome iOS',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1',
    false,
  ],
  [
    'Chrome desktop',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    false,
  ],
];

describe('isKnownInAppBrowser', () => {
  it.each(CASES)('classifie %s', (_name, ua, expected) => {
    expect(isKnownInAppBrowser(ua)).toBe(expected);
  });
});

describe('buildSystemBrowserOpenUrl', () => {
  const page = 'https://moviepicker.app/e/soiree?join=1';

  it('ouvre Safari depuis un WebView iOS', () => {
    expect(
      buildSystemBrowserOpenUrl(
        page,
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.71.0.34'
      )
    ).toBe('x-safari-https://moviepicker.app/e/soiree?join=1');
  });

  it('ouvre Chrome depuis un WebView Android', () => {
    expect(
      buildSystemBrowserOpenUrl(
        page,
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 302.0.0.23.114'
      )
    ).toBe(
      'intent://moviepicker.app/e/soiree?join=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fmoviepicker.app%2Fe%2Fsoiree%3Fjoin%3D1;end'
    );
  });

  it('retourne null dans un navigateur desktop', () => {
    expect(
      buildSystemBrowserOpenUrl(
        page,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBeNull();
  });

  it('n’injecte pas le hash dans l’intent Android', () => {
    expect(
      buildSystemBrowserOpenUrl(
        'https://moviepicker.app/e/soiree?join=1#wheel',
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 302.0.0.23.114'
      )
    ).toBe(
      'intent://moviepicker.app/e/soiree?join=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fmoviepicker.app%2Fe%2Fsoiree%3Fjoin%3D1%23wheel;end'
    );
  });

  it('refuse les protocoles non http(s)', () => {
    expect(
      buildSystemBrowserOpenUrl(
        'javascript:alert(1)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.71.0.34'
      )
    ).toBeNull();
  });

  it('retourne null pour une URL invalide', () => {
    expect(buildSystemBrowserOpenUrl('not-a-url', 'Snapchat/12')).toBeNull();
  });
});
