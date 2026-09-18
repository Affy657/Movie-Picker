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
import { useLocale, useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import type { MyEventSummary } from '@/features/events/types';
import Card from '@/shared/components/Card';
import styles from './PendingEventCard.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface PendingEventCardProps {
  event: MyEventSummary;
  onCloseWithoutMovie?: () => void;
  closing?: boolean;
}

export default function PendingEventCard({
  event,
  onCloseWithoutMovie,
  closing = false,
}: Readonly<PendingEventCardProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const compact = useIsMobile();

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
          <p className={styles.description}>
            {t(event.isCreator ? 'events.pending.hostText' : 'events.pending.participantText')}
          </p>
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
                {t('events.myEvents.pendingChooseMovieAction')}
              </Link>
              {onCloseWithoutMovie ? (
                <Button
                  type="button"

                  onClick={onCloseWithoutMovie}
                  disabled={closing}
                >
                  {t('events.wheel.closeWithoutMovieButton')}
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
