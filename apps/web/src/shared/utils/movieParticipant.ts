import type { MovieData } from '@/shared/types/movie';

export function getParticipantId(movie: Pick<MovieData, 'participantId'>): string {
  return movie.participantId;
}
