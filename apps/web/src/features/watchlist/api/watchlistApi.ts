import { fetchApi } from '@/shared/api/client';
import type { MovieMediaType } from '@/shared/types/movie';

export interface WatchlistItem {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  genreIds?: number[];
  createdAt: string;
}

interface WatchlistResponse {
  items: WatchlistItem[];
}

export interface AddWatchlistItemBody {
  tmdbId: number;
  mediaType?: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
}

export async function fetchWatchlist(signal?: AbortSignal): Promise<WatchlistItem[]> {
  const res = await fetchApi<WatchlistResponse>('/watchlist', signal ? { signal } : undefined);
  return Array.isArray(res?.items) ? res.items : [];
}

export async function addToWatchlist(body: AddWatchlistItemBody): Promise<void> {
  await fetchApi('/watchlist', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function removeFromWatchlist(
  tmdbId: number,
  mediaType: MovieMediaType = 'movie'
): Promise<void> {
  const params = new URLSearchParams({ mediaType });
  await fetchApi(`/watchlist/${tmdbId}?${params.toString()}`, { method: 'DELETE' });
}
