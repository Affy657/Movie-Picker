export function isSafeTmdbWatchPageUrl(url: string | null | undefined): url is string {
  if (url == null || typeof url !== 'string') return false;
  const t = url.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'www.themoviedb.org' || h === 'themoviedb.org';
  } catch {
    return false;
  }
}

export function safeTmdbWatchUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:') return null;
    const h = u.hostname.toLowerCase();
    if (h !== 'www.themoviedb.org' && h !== 'themoviedb.org') return null;
    return `https://www.themoviedb.org${encodeURI(u.pathname)}${u.search ? encodeURI(u.search) : ''}`;
  } catch {
    return null;
  }
}
