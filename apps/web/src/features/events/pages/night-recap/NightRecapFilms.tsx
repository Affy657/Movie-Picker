import { useMemo } from 'react';
import { Link } from 'react-router';
import { Star } from 'lucide-react';
import EventWinnerSummary from '@/features/events/pages/event-detail/EventWinnerSummary';
import RatingNotes from '@/features/events/components/RatingNotes';
import type { ParticipantRating } from '@/features/events/components/RatingNotes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ROUTES } from '@/app/routes';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import styles from './NightRecap.module.css';

function recapRows(movie: MovieData, event: EventData, myParticipantId: string | null) {
  const byParticipant = new Map((movie.ratings ?? []).map((r) => [r.participantId, r.value]));
  const rows: ParticipantRating[] = (event.participants ?? []).map((p) => ({
    participantId: p.id,
    pseudo: p.pseudo,
    avatarId: p.avatarId ?? null,
    value: byParticipant.get(p.id) ?? null,
    isSelf: p.id === myParticipantId,
    handle: p.handle,
    isCreator: !!p.isCreator,
  }));
  return [...rows.filter((r) => r.isSelf), ...rows.filter((r) => !r.isSelf)];
}

export default function NightRecapFilms({
  event,
  winners,
}: Readonly<{ event: EventData; winners: MovieData[] }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const myParticipantId = event.myParticipant?.id ?? null;
  const scale = user?.ratingScale ?? 'five';
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
    <div className={styles.films}>
      <EventWinnerSummary
        winners={winners}
        isFinished={!!event.isFinished}
        participantAvatars={participantAvatars}
        posterSize="lg"
        renderRating={(movie) => (
          <RatingNotes
            participants={recapRows(movie, event, myParticipantId)}
            scale={scale}
            alwaysList
            selfAction={
              myParticipantId ? (
                <Link
                  to={ROUTES.eventDetailRating(event.slug, movie.id)}
                  className={buttonClass({
                    variant: 'primary',
                    size: 'sm',
                    className: styles.rateLink,
                  })}
                >
                  <Star size={ICON_SIZE.sm} aria-hidden />
                  {t('events.recap.rateAction')}
                </Link>
              ) : null
            }
          />
        )}
      />
    </div>
  );
}
