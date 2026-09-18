import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { MovieMediaType } from '@/shared/types/movie';

export const MOVIE_DETAILS_PARAM: Record<MovieMediaType, string> = { movie: 'film', tv: 'serie' };

export interface MovieDetailsTarget {
  tmdbId: number;
  mediaType: MovieMediaType;
}

export function readMovieDetailsTarget(params: URLSearchParams): MovieDetailsTarget | null {
  for (const mediaType of ['movie', 'tv'] as const) {
    const raw = params.get(MOVIE_DETAILS_PARAM[mediaType]);
    if (raw === null) continue;
    const tmdbId = Number(raw);
    return Number.isInteger(tmdbId) && tmdbId > 0 ? { tmdbId, mediaType } : null;
  }
  return null;
}

function withoutTarget(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(MOVIE_DETAILS_PARAM.movie);
  next.delete(MOVIE_DETAILS_PARAM.tv);
  return next;
}

const NAVIGATE_OPTIONS = { replace: true, preventScrollReset: true } as const;

export function useMovieDetailsParam() {
  const [params, setParams] = useSearchParams();
  const target = useMemo(() => readMovieDetailsTarget(params), [params]);

  const open = useCallback(
    (tmdbId: number, mediaType: MovieMediaType = 'movie') => {
      setParams((prev) => {
        const next = withoutTarget(prev);
        next.set(MOVIE_DETAILS_PARAM[mediaType], String(tmdbId));
        return next;
      }, NAVIGATE_OPTIONS);
    },
    [setParams]
  );

  const close = useCallback(() => {
    setParams((prev) => withoutTarget(prev), NAVIGATE_OPTIONS);
  }, [setParams]);

  return { target, open, close };
}
