import { describe, it, expect } from 'vitest';
import { isKnownInAppBrowser } from '@/shared/utils/inAppBrowser';

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
    'Safari iOS',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
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
