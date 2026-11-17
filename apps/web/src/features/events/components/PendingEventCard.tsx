import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import {
  ParticipantStat,
  MoviesStat,
  EventCardMeta,
} from '@/features/events/components/EventSummaryCard';
import EventDateChip from '@/features/events/components/EventDateChip';
import { formatRelativeTime } from '@/shared/utils/formatRelativeTime';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { ROUTES } from '@/app/routes';
import type { MyEventSummary } from '@/features/events/types';
import Card from '@/shared/components/Card';
import styles from './PendingEventCard.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface PendingEventCardProps {
  event: MyEventSummary;
  onCloseWithoutMovie?: () => void;
  onFinishNight?: () => void;
  closing?: boolean;
}

function pendingDescription(event: MyEventSummary, drawnCount: number, t: Translate): string {
  if (drawnCount === 0) {
    return t(event.isCreator ? 'events.pending.hostText' : 'events.pending.participantText');
  }
  return event.isCreator
    ? pluralizeCount(
        drawnCount,
        'events.pending.hostTextWithFilmOne',
        'events.pending.hostTextWithFilmMany',
        t
      )
    : pluralizeCount(
        drawnCount,
        'events.pending.participantTextWithFilmOne',
        'events.pending.participantTextWithFilmMany',
        t
      );
}

export default function PendingEventCard({
  event,
  onCloseWithoutMovie,
  onFinishNight,
  closing = false,
}: Readonly<PendingEventCardProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const compact = useIsMobile();
  const drawnCount = event.winnerMovies?.length ?? 0;
  const onClose = drawnCount > 0 ? onFinishNight : onCloseWithoutMovie;

  return (
    <Card as="article" padding="none" elevation="sm" className={styles.card}>
      <div className={styles.head}>
        <EventLifecyclePill lifecycle="pending" />
        {event.autoCloseAt ? (
          <span className={styles.autoClose}>
            <Clock aria-hidden size={ICON_SIZE.xs} />
            <span>
              {t(
                compact
                  ? 'events.myEvents.pendingAutoCloseInShort'
                  : 'events.myEvents.pendingAutoCloseIn',
                { time: formatRelativeTime(event.autoCloseAt, locale) }
              )}
            </span>
          </span>
        ) : null}
      </div>

      <div className={styles.row}>
        <EventDateChip date={event.date} time={event.time} tone="pending" />
        <div className={styles.body}>
          <h3 className={styles.title}>{event.title}</h3>
          {event.theme ? <span className={styles.theme}>{event.theme}</span> : null}
          <p className={styles.description}>{pendingDescription(event, drawnCount, t)}</p>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.stats}>
          <EventCardMeta event={event} lifecycle="pending" compact={compact} />
          <ParticipantStat
            count={event.participantCount ?? 0}
            maxParticipants={event.maxParticipants}
            t={t}
          />
          <MoviesStat count={event.movieCount ?? 0} t={t} />
        </span>
        <div className={styles.actions}>
          {event.isCreator ? (
            <>
              <Link
                to={ROUTES.eventDetail(event.slug)}
                className={buttonClass({ variant: 'primary' })}
              >
                {drawnCount > 0
                  ? t('events.wheel.drawOneMoreButton')
                  : t('events.myEvents.pendingChooseMovieAction')}
              </Link>
              {onClose ? (
                <Button type="button" onClick={onClose} disabled={closing}>
                  {drawnCount > 0
                    ? t('events.wheel.finishNightButton')
                    : t('events.wheel.closeWithoutMovieButton')}
                </Button>
              ) : null}
            </>
          ) : (
            <Link to={ROUTES.eventDetail(event.slug)} className={buttonClass()}>
              {t('events.myEvents.pendingViewEventAction')}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
