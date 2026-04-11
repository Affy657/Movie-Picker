import type { MovieData } from '@/shared/types/movie';

/** Extracts the participant ID regardless of whether participantId is a string or populated object. */
export function getParticipantId(movie: MovieData): string {
  const p = movie.participantId;
  if (typeof p === 'object' && p !== null && 'id' in p && typeof p.id === 'string') {
    return p.id;
  }
  return String(p);
}
