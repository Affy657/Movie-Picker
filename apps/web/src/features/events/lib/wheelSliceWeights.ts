import type { WheelMode } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';

function netScoreOf(movie: MovieData): number {
  return Number.isFinite(movie.score) ? movie.score : 0;
}

export function wheelSliceWeights(movies: readonly MovieData[], mode: WheelMode): number[] {
  if (mode === 'strictRandom') return movies.map(() => 1);
  return movies.map((movie) => Math.max(1, 1 + netScoreOf(movie)));
}
