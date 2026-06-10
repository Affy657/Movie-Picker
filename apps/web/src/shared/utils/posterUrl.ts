import { apiUrl } from '@/shared/api/client';

const TMDB_POSTER_SIZE_SEGMENT = /\/t\/p\/w\d+\//i;

export function tmdbPosterSrcForListDisplay(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== 'image.tmdb.org') return url;
    if (!TMDB_POSTER_SIZE_SEGMENT.test(u.pathname)) return url;
    u.pathname = u.pathname.replace(TMDB_POSTER_SIZE_SEGMENT, '/t/p/w185/');
    return u.toString();
  } catch {
    return url;
  }
}

export function posterImageSrc(posterPath: string | null | undefined): string | undefined {
  if (posterPath == null) return undefined;
  const trimmed = posterPath.trim();
  if (trimmed === '') return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const p = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return apiUrl(p);
}

export function tmdbPosterSrcSetForList(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== 'image.tmdb.org') return undefined;
    if (!TMDB_POSTER_SIZE_SEGMENT.test(u.pathname)) return undefined;
    const base = u.pathname;
    const make = (size: string) => {
      const replacement = `/t/p/${size}/`;
      return `https://${u.hostname}${base.replace(TMDB_POSTER_SIZE_SEGMENT, replacement)}`;
    };
    return `${make('w92')} 92w, ${make('w185')} 185w, ${make('w342')} 342w`;
  } catch {
    return undefined;
  }
}
