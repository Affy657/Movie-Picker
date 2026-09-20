import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { RATE_QUERY_PARAM } from '@/app/routes';
import type { MovieData } from '@/shared/types/movie';

export function ratingLinkTarget(
  winners: MovieData[],
  participantId: string | null,
  isFinished: boolean
): string | null {
  if (!participantId || !isFinished) return null;
  const unrated = winners.find(
    (movie) => !(movie.ratings ?? []).some((rating) => rating.participantId === participantId)
  );
  return unrated?.id ?? null;
}

export function useRatingLink(
  winners: MovieData[],
  participantId: string | null,
  isFinished: boolean
): { movieId: string | null; consume: () => void } {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.has(RATE_QUERY_PARAM);
  const movieId = requested ? ratingLinkTarget(winners, participantId, isFinished) : null;
  const consume = useCallback(() => {
    if (!requested) return;
    const next = new URLSearchParams(searchParams);
    next.delete(RATE_QUERY_PARAM);
    setSearchParams(next, { replace: true });
  }, [requested, searchParams, setSearchParams]);
  return { movieId, consume };
}
