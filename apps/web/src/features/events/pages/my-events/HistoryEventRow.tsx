import { Link } from 'react-router';
import { Crown, Film, Trophy } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import { ParticipantStat, MoviesStat } from '@/features/events/components/EventSummaryCard';
import EventCardMenu from '@/features/events/components/EventCardMenu';
import { useLocale, useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import type { MyEventSummary } from '@/features/events/types';
import styles from './HistoryEventRow.module.css';
import Card from '@/shared/components/Card';

interface HistoryEventRowProps {
  event: MyEventSummary;
  onDelete?: () => void;
  onRemove?: () => void;
  onReuse?: () => void;
}

export default function HistoryEventRow({
  event,
  onDelete,
  onRemove,
  onReuse,
}: Readonly<HistoryEventRowProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  return (
    <Card as="article" padding="none" elevation="sm" className={styles.row}>
      <Link
        to={ROUTES.eventDetail(event.slug)}
        className={styles.thumbLink}
        tabIndex={-1}
        aria-hidden="true"
      >
        {event.winnerMovieTitle && event.winnerMoviePosterPath ? (
          <img
            src={posterImageSrc(event.winnerMoviePosterPath)}
            alt=""
            aria-hidden
            className={styles.poster}
            width={52}
            height={78}
          />
        ) : (
          <span className={styles.posterFallback} aria-hidden>
            <Film size={18} />
          </span>
        )}
      </Link>

      <Link to={ROUTES.eventDetail(event.slug)} className={styles.body}>
        <h3 className={styles.title}>{event.title}</h3>
        {event.winnerMovieTitle ? (
          <span
            className={styles.winner}
            aria-label={t('events.myEvents.winnerMovieLabel', { title: event.winnerMovieTitle })}
          >
            <Trophy aria-hidden size={13} />
            <span aria-hidden="true">{event.winnerMovieTitle}</span>
          </span>
        ) : (
          <span className={styles.noWinner}>
            {t('events.myEvents.historyFinishedWithoutMovie')}
          </span>
        )}
      </Link>

      <div className={styles.side}>
        <span className={styles.stats}>
          <ParticipantStat
            count={event.participantCount ?? 0}
            maxParticipants={event.maxParticipants}
            t={t}
          />
          <MoviesStat count={event.movieCount ?? 0} t={t} />
        </span>
        <span className={styles.date}>{formatMyEventsListDate(event.date, locale)}</span>
        {event.isCreator ? (
          <span className={styles.hostIcon} title={t('events.myEvents.hostBadgeTitle')}>
            <Crown aria-hidden size={13} />
          </span>
        ) : (
          <span className={styles.hostIconPlaceholder} aria-hidden />
        )}
        <EventCardMenu
          title={event.title}
          onDelete={onDelete}
          onRemove={onRemove}
          onReuse={onReuse}
          removeLabel={t('events.myEvents.historyRemoveAction')}
        />
      </div>
    </Card>
  );
}
