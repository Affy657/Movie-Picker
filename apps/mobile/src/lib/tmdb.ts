const RAW_BASE = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE ?? 'https://image.tmdb.org/t/p';
const BASE = RAW_BASE.replace(/\/$/, '');

export function posterUrl(posterPath: string | null | undefined, size: 'w185' | 'w342' | 'w500' = 'w342'): string | null {
  if (!posterPath) return null;
  const cleaned = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
  return `${BASE}/${size}${cleaned}`;
}

export function logoUrl(logoPath: string | null | undefined, size: 'w45' | 'w92' | 'w154' = 'w45'): string | null {
  if (!logoPath) return null;
  const cleaned = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;
  return `${BASE}/${size}${cleaned}`;
}
