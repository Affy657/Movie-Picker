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
