const KNOWN_IN_APP_BROWSER_PATTERNS = [
  /Snapchat/i,
  /Instagram/i,
  /BytedanceWebview|TikTok|musical_ly/i,
  /FBAN|FBAV|FB_IAB|FB4A|FBIOS/i,
  /WhatsApp/i,
];

function isIosInAppWebView(userAgent: string): boolean {
  if (!/iPhone|iPad|iPod/i.test(userAgent)) return false;
  if (!/AppleWebKit/i.test(userAgent)) return false;
  return !/Safari/i.test(userAgent);
}

export function isKnownInAppBrowser(userAgent: string): boolean {
  if (KNOWN_IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(userAgent))) return true;
  return isIosInAppWebView(userAgent);
}

export function buildSystemBrowserOpenUrl(href: string, userAgent: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return `x-safari-${url.href}`;
  }

  if (/Android/i.test(userAgent)) {
    const path = `${url.host}${url.pathname}${url.search}`;
    const scheme = url.protocol.replace(':', '');
    const fallback = encodeURIComponent(url.href);
    return `intent://${path}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
  }

  return null;
}
