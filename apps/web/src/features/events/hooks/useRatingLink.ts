import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { RATE_QUERY_PARAM } from '@/app/routes';
import type { MovieData } from '@/shared/types/movie';

export function isRatingOpen(event: { isFinished?: boolean; lifecycle?: string }): boolean {
  return !!event.isFinished || event.lifecycle === 'live' || event.lifecycle === 'pending';
}

export function hasRated(movie: MovieData, participantId: string | null): boolean {
  return (movie.ratings ?? []).some((rating) => rating.participantId === participantId);
}

export function unratedWinners(winners: MovieData[], participantId: string): MovieData[] {
  return winners.filter((movie) => !hasRated(movie, participantId));
}

export function ratingLinkTarget(
  winners: MovieData[],
  participantId: string | null,
  isFinished: boolean,
  requestedMovieId: string | null = null
): string | null {
  if (!participantId || !isFinished) return null;
  const unrated = unratedWinners(winners, participantId);
  const requested = unrated.find((movie) => movie.id === requestedMovieId);
  return requested?.id ?? unrated[0]?.id ?? null;
}

export function useRatingLink(
  winners: MovieData[],
  participantId: string | null,
  isFinished: boolean,
  promptDue = false,
  onPrompted?: () => void
): { movieId: string | null; consume: () => void } {
  const [searchParams, setSearchParams] = useSearchParams();
  const [promptDone, setPromptDone] = useState(false);
  const requested = searchParams.has(RATE_QUERY_PARAM);
  const linkMovieId = requested
    ? ratingLinkTarget(winners, participantId, isFinished, searchParams.get(RATE_QUERY_PARAM))
    : null;
  const promptMovieId =
    !requested && promptDue && !promptDone
      ? ratingLinkTarget(winners, participantId, isFinished)
      : null;
  const movieId = linkMovieId ?? promptMovieId;
  const consume = useCallback(() => {
    if (movieId && participantId) onPrompted?.();
    setPromptDone(true);
    if (!requested) return;
    const next = new URLSearchParams(searchParams);
    next.delete(RATE_QUERY_PARAM);
    setSearchParams(next, { replace: true });
  }, [movieId, participantId, onPrompted, requested, searchParams, setSearchParams]);
  const nothingLeftToRate =
    requested && linkMovieId === null && !!participantId && isFinished && winners.length > 0;
  useEffect(() => {
    if (nothingLeftToRate) consume();
  }, [nothingLeftToRate, consume]);
  return { movieId, consume };
}
