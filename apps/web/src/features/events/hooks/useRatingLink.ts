import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { RATE_QUERY_PARAM } from '@/app/routes';
import type { MovieData } from '@/shared/types/movie';
import { daysUntilEventDate } from '@/shared/utils/formatRelativeEventDate';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';

const PROMPTED_KEY = 'moviepicker_rating_prompted';
const PROMPTED_MAX = 100;
const RECENT_NIGHT_DAYS = 7;

export function isRatingOpen(event: { isFinished?: boolean; lifecycle?: string }): boolean {
  return !!event.isFinished || event.lifecycle === 'live';
}

export function isRecentNight(date: string | null | undefined): boolean {
  const days = date ? daysUntilEventDate(date) : null;
  return days !== null && days >= -RECENT_NIGHT_DAYS;
}

function readPrompted(): string[] {
  try {
    const parsed: unknown = JSON.parse(safeLocalStorageGet(PROMPTED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

function rememberPrompted(entry: string): void {
  const kept = readPrompted().filter((known) => known !== entry);
  safeLocalStorageSet(PROMPTED_KEY, JSON.stringify([...kept, entry].slice(-PROMPTED_MAX)));
}

function unratedWinners(winners: MovieData[], participantId: string): MovieData[] {
  return winners.filter(
    (movie) => !(movie.ratings ?? []).some((rating) => rating.participantId === participantId)
  );
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

function promptTarget(
  winners: MovieData[],
  participantId: string | null,
  isFinished: boolean,
  prompted: readonly string[]
): string | null {
  if (!participantId || !isFinished) return null;
  const fresh = unratedWinners(winners, participantId).find(
    (movie) => !prompted.includes(`${participantId}:${movie.id}`)
  );
  return fresh?.id ?? null;
}

export function useRatingLink(
  winners: MovieData[],
  participantId: string | null,
  isFinished: boolean,
  autoPrompt = false
): { movieId: string | null; consume: () => void } {
  const [searchParams, setSearchParams] = useSearchParams();
  const [prompted] = useState(readPrompted);
  const [promptDone, setPromptDone] = useState(false);
  const requested = searchParams.has(RATE_QUERY_PARAM);
  const linkMovieId = requested
    ? ratingLinkTarget(winners, participantId, isFinished, searchParams.get(RATE_QUERY_PARAM))
    : null;
  const promptMovieId =
    !requested && autoPrompt && !promptDone
      ? promptTarget(winners, participantId, isFinished, prompted)
      : null;
  const movieId = linkMovieId ?? promptMovieId;
  const consume = useCallback(() => {
    if (movieId && participantId) rememberPrompted(`${participantId}:${movieId}`);
    setPromptDone(true);
    if (!requested) return;
    const next = new URLSearchParams(searchParams);
    next.delete(RATE_QUERY_PARAM);
    setSearchParams(next, { replace: true });
  }, [movieId, participantId, requested, searchParams, setSearchParams]);
  const nothingLeftToRate =
    requested && linkMovieId === null && !!participantId && isFinished && winners.length > 0;
  useEffect(() => {
    if (nothingLeftToRate) consume();
  }, [nothingLeftToRate, consume]);
  return { movieId, consume };
}
