import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { MovieMediaType } from '@/shared/types/movie';

export interface MoviePageSeed {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year?: string;
  posterPath?: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  genreIds?: number[];
}

export interface MoviePageLocationState {
  fromApp: true;
  seed?: MoviePageSeed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readMoviePageState(state: unknown): MoviePageLocationState | null {
  if (!isRecord(state) || state.fromApp !== true) return null;
  const seed = isRecord(state.seed) ? (state.seed as unknown as MoviePageSeed) : undefined;
  return { fromApp: true, seed };
}

export function useOpenMoviePage() {
  const navigate = useNavigate();
  return useCallback(
    (seed: MoviePageSeed, nightSlug?: string) => {
      const state: MoviePageLocationState = { fromApp: true, seed };
      navigate(ROUTES.moviePage(seed, nightSlug), { state });
    },
    [navigate]
  );
}
