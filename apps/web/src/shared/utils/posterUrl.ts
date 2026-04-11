import { apiUrl } from '@/shared/api/client';

const TMDB_POSTER_SIZE_SEGMENT = /\/t\/p\/w\d+\//i;

/**
 * Passe une affiche TMDB en w185 pour des miniatures liste plus nettes (l’API recherche renvoie souvent w154).
 */
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

/**
 * URL absolue pour une balise <img> : URLs TMDB inchangées, chemins API (/api/v1/…) préfixés avec VITE_API_URL.
 */
export function posterImageSrc(posterPath: string | null | undefined): string | undefined {
  if (posterPath == null) return undefined;
  const trimmed = posterPath.trim();
  if (trimmed === '') return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const p = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return apiUrl(p);
}
