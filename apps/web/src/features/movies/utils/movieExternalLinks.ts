import type { MovieMediaType } from '@/shared/types/movie';

export function letterboxdUrl(tmdbId: number, mediaType?: MovieMediaType, title?: string): string {
  if (mediaType === 'tv') {
    return `https://letterboxd.com/search/films/${encodeURIComponent(title ?? '')}/`;
  }
  return `https://letterboxd.com/tmdb/${tmdbId}/`;
}

export function imdbUrl(title: string, year?: string): string {
  const q = year ? `${title} ${year}` : title;
  return `https://www.imdb.com/find/?q=${encodeURIComponent(q)}&s=tt`;
}

export function allocineUrl(title: string): string {
  return `https://www.allocine.fr/recherche/?q=${encodeURIComponent(title)}`;
}

export function tmdbPageUrl(tmdbId: number, mediaType?: MovieMediaType): string {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  return `https://www.themoviedb.org/${type}/${tmdbId}`;
}
