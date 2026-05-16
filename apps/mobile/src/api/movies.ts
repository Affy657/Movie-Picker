import { request } from './client';
import type { components } from './types.gen';

type Schemas = components['schemas'];
export type MovieWithScore = Schemas['MovieWithScoreResponse'];
export type AddMovieRequest = Schemas['AddMovieRequest'];
export type VoteRequest = Schemas['VoteRequest'];
export type VoteResponse = Schemas['VoteResponse'];
export type MarkAsSeenRequest = Schemas['MarkAsSeenRequest'];
export type MovieSearchItem = Schemas['MovieSearchItemResponse'];
export type MovieSearchListResponse = Schemas['MovieSearchListResponse'];
export type MovieDetailsResponse = Schemas['MovieDetailsResponse'];

export function listMovies(idOrSlug: string, participantId?: string) {
  return request<MovieWithScore[]>(`/events/${encodeURIComponent(idOrSlug)}/movies`, {
    query: participantId ? { participantId } : undefined,
  });
}

export function addMovie(idOrSlug: string, body: AddMovieRequest) {
  return request<MovieWithScore>(`/events/${encodeURIComponent(idOrSlug)}/movies`, {
    method: 'POST',
    body,
  });
}

export function removeMovie(idOrSlug: string, movieId: string) {
  return request<void>(
    `/events/${encodeURIComponent(idOrSlug)}/movies/${encodeURIComponent(movieId)}`,
    { method: 'DELETE' }
  );
}

export function vote(idOrSlug: string, movieId: string, body: VoteRequest) {
  return request<VoteResponse>(
    `/events/${encodeURIComponent(idOrSlug)}/movies/${encodeURIComponent(movieId)}/vote`,
    { method: 'POST', body }
  );
}

export function cancelVote(idOrSlug: string, movieId: string, participantId: string) {
  return request<void>(
    `/events/${encodeURIComponent(idOrSlug)}/movies/${encodeURIComponent(movieId)}/vote`,
    { method: 'DELETE', query: { participantId } }
  );
}

export function markSeen(idOrSlug: string, movieId: string, body: MarkAsSeenRequest) {
  return request<MovieWithScore>(
    `/events/${encodeURIComponent(idOrSlug)}/movies/${encodeURIComponent(movieId)}/seen`,
    { method: 'POST', body }
  );
}

export function unmarkSeen(idOrSlug: string, movieId: string, participantId: string) {
  return request<MovieWithScore>(
    `/events/${encodeURIComponent(idOrSlug)}/movies/${encodeURIComponent(movieId)}/seen`,
    { method: 'DELETE', query: { participantId } }
  );
}

export function searchTmdb(q: string) {
  return request<MovieSearchListResponse>('/movies/search', {
    query: { q },
    noAuth: true,
  });
}

export function getMovieDetails(tmdbId: number) {
  return request<MovieDetailsResponse>(`/movies/tmdb/${tmdbId}/details`, { noAuth: true });
}
