const KNOWN_IN_APP_BROWSER_PATTERNS = [
  /Snapchat/i,
  /Instagram/i,
  /BytedanceWebview|TikTok|musical_ly/i,
];

export function isKnownInAppBrowser(userAgent: string): boolean {
  return KNOWN_IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(userAgent));
}
