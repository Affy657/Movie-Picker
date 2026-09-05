export function toAbsoluteTmdbLogoUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith('https://image.tmdb.org')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('/')) return `https://image.tmdb.org${t}`;
  try {
    const u = new URL(t);
    if (u.hostname === 'image.tmdb.org') {
      u.protocol = 'https:';
      return u.toString();
    }
  } catch {}
  return t;
}

export function isSafeTmdbLogoUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(toAbsoluteTmdbLogoUrl(url));
    return u.protocol === 'https:' && u.hostname === 'image.tmdb.org';
  } catch {
    return false;
  }
}

export function tmdbLogoSrcForUi(url: string): string {
  const abs = toAbsoluteTmdbLogoUrl(url);
  try {
    const u = new URL(abs);
    if (u.hostname !== 'image.tmdb.org') return abs;
    u.pathname = u.pathname.replace(/\/t\/p\/w\d+\//i, '/t/p/w154/');
    return u.toString();
  } catch {
    return abs;
  }
}
