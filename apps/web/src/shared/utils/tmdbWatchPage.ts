export function safeTmdbWatchHref(watchPageUrl: string | null | undefined): string | null {
  if (!watchPageUrl) return null;
  try {
    const u = new URL(watchPageUrl.trim());
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    if (host !== 'www.themoviedb.org' && host !== 'themoviedb.org') return null;
    return `https://www.themoviedb.org${encodeURI(u.pathname)}${u.search ? encodeURI(u.search) : ''}`;
  } catch {
    return null;
  }
}
