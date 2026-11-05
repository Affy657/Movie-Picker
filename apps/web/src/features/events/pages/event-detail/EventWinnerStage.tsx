import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { isRatingOpen, isRecentNight, useRatingLink } from '@/features/events/hooks/useRatingLink';
import type { EventData } from '@/features/events/types';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';
import EventWinnerSummary, { type WinnerRatingContext } from './EventWinnerSummary';
import { useEventMovieRating } from './useEventMovieRating';

type Props = {
  slug: string;
  event: EventData;
  winners: MovieData[];
  participant: { participantId: string; pseudo: string } | null;
  refreshAll: () => void;
};

export function isWinnerStageShown(
  winners: MovieData[],
  wheel: { manualMode: boolean; removalMode: boolean }
): boolean {
  return winners.length > 0 && !wheel.manualMode && !wheel.removalMode;
}

function useWinnerRating({
  slug,
  event,
  winners,
  participant,
  refreshAll,
}: Props): WinnerRatingContext {
  const { user } = useAuth();
  const movieRating = useEventMovieRating({ slug, participant, refreshAll });
  const signedInParticipantId = user ? (participant?.participantId ?? null) : null;
  const ratingLink = useRatingLink(
    winners,
    signedInParticipantId,
    isRatingOpen(event),
    !!event.isFinished && isRecentNight(event.date)
  );
  return {
    scale: user?.ratingScale ?? 'five',
    participants: event.participants ?? [],
    currentParticipantId: signedInParticipantId,
    error: movieRating.error,
    onSave: movieRating.save,
    onClear: movieRating.clear,
    autoOpenMovieId: ratingLink.movieId,
    onAutoOpen: ratingLink.consume,
    signInHref: user
      ? undefined
      : (movieId) => withReturnTo(ROUTES.login, ROUTES.eventDetailRating(slug, movieId)),
  };
}

export default function EventWinnerStage({
  slug,
  event,
  winners,
  participant,
  refreshAll,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const rating = useWinnerRating({ slug, event, winners, participant, refreshAll });
  const participantAvatars = useMemo(
    () =>
      Object.fromEntries(
        (event.participants ?? [])
          .filter((p) => p.avatarId)
          .map((p) => [p.id, p.avatarId as string])
      ),
    [event.participants]
  );
  return (
    <EventWinnerSummary
      winners={winners}
      isFinished={!!event.isFinished}
      ratingOpen={isRatingOpen(event)}
      date={event.date}
      participantAvatars={participantAvatars}
      rating={rating}
      action={
        event.recapSlug ? (
          <Link
            to={ROUTES.nightRecap(event.recapSlug)}
            className={buttonClass({ variant: 'ghost' })}
          >
            {t('events.recap.viewRecap')}
            <ArrowRight size={ICON_SIZE.sm} aria-hidden />
          </Link>
        ) : undefined
      }
    />
  );
}
