import type { MovieData } from '@/shared/types/movie';

export function getParticipantId(movie: MovieData): string {
  const p = movie.participantId;
  if (typeof p === 'object' && p !== null && 'id' in p && typeof p.id === 'string') {
    return p.id;
  }
  return typeof p === 'string' ? p : JSON.stringify(p);
}
