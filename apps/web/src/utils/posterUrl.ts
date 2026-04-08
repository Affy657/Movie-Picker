import { apiUrl } from '../api/client';

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
