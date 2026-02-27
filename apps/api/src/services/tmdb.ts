import { env } from '../config/env';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w154';

export interface TmdbSearchResult {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
}

interface TmdbMovieItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const apiKey = env.tmdbApiKey;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY non configurée');
  }
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${q}&language=fr-FR`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }
  const data = (await res.json()) as { results?: TmdbMovieItem[] };
  const results = data.results ?? [];
  return results.slice(0, 20).map((item) => ({
    id: item.id,
    title: item.title ?? item.name ?? '',
    year: (item.release_date ?? item.first_air_date ?? '').slice(0, 4),
    posterPath: item.poster_path ? `${POSTER_BASE}${item.poster_path}` : null,
  }));
}
