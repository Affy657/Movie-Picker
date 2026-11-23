import type { WheelMode } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';

function netScoreOf(movie: MovieData): number {
  return Number.isFinite(movie.score) ? movie.score : 0;
}

export function wheelSliceWeights(movies: readonly MovieData[], mode: WheelMode): number[] {
  if (mode === 'strictRandom') return movies.map(() => 1);
  return movies.map((movie) => Math.max(1, 1 + netScoreOf(movie)));
}

const SMALLEST_CHANCE_SHOWN = 0.01;

export function wheelChanceLabels(weights: readonly number[], locale: string): string[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  return weights.map((weight) =>
    percent.format(total > 0 ? Math.max(weight / total, SMALLEST_CHANCE_SHOWN) : 0)
  );
}
