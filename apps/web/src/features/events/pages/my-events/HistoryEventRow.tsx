import { Link } from 'react-router';
import { Crown, Film, Trophy } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import { ParticipantStat, MoviesStat } from '@/features/events/components/EventSummaryCard';
import EventCardMenu from '@/features/events/components/EventCardMenu';
import { useLocale, useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import type { MyEventSummary } from '@/features/events/types';
import { winnerPosterPaths, winnerTitles } from '@/features/events/utils/eventWinners';
import styles from './HistoryEventRow.module.css';
import Card from '@/shared/components/Card';

interface HistoryEventRowProps {
  event: MyEventSummary;
  onDelete?: () => void;
  onRemove?: () => void;
}

export default function HistoryEventRow({
  event,
  onDelete,
  onRemove,
}: Readonly<HistoryEventRowProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const winners = event.winnerMovies ?? [];
  const firstPoster = winnerPosterPaths(winners)[0] ?? null;
  const titles = winnerTitles(winners, locale);

  return (
    <Card as="article" padding="none" elevation="sm" className={styles.row}>
      <Link
        to={ROUTES.eventDetail(event.slug)}
        className={styles.thumbLink}
        tabIndex={-1}
        aria-hidden="true"
      >
        {firstPoster ? (
          <span className={styles.posterSlot}>
            <img
              src={posterImageSrc(firstPoster)}
              alt=""
              aria-hidden
              className={styles.poster}
              width={52}
              height={78}
            />
            {winners.length > 1 ? (
              <span className={styles.posterCount} aria-hidden>
                {winners.length}
              </span>
            ) : null}
          </span>
        ) : (
          <span className={styles.posterFallback} aria-hidden>
            <Film size={18} />
          </span>
        )}
      </Link>

      <Link to={ROUTES.eventDetail(event.slug)} className={styles.body}>
        <h3 className={styles.title}>{event.title}</h3>
        {winners.length > 0 ? (
          <span
            className={styles.winner}
            aria-label={t('events.myEvents.winnerMoviesLabel', { titles })}
          >
            <Trophy aria-hidden size={13} />
            <span aria-hidden="true">{titles}</span>
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
          removeLabel={t('events.myEvents.historyRemoveAction')}
        />
      </div>
    </Card>
  );
}
