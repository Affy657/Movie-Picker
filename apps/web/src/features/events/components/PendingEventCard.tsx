import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import { ParticipantStat, MoviesStat } from '@/features/events/components/EventSummaryCard';
import { formatEventTime } from '@/shared/utils/formatMyEventsListDate';
import { formatRelativeTime } from '@/shared/utils/formatRelativeTime';
import { useLocale, useTranslation } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { ROUTES } from '@/app/routes';
import type { MyEventSummary } from '@/features/events/types';
import styles from './PendingEventCard.module.css';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

function formatLongDateWithTime(date: string, time: string, locale: LocaleCode): string {
  const parts = date.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return date;
  const [y, m, d] = parts as [number, number, number];
  const parsed = new Date(y, m - 1, d);
  if (Number.isNaN(parsed.getTime())) return date;
  const datePart = new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(parsed);
  return `${datePart}, ${formatEventTime(time)}`;
}

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
  const dateTimeLabel = formatLongDateWithTime(event.date, event.time, locale);

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <EventLifecyclePill lifecycle="pending" />
        {event.autoCloseAt ? (
          <span className={styles.autoClose}>
            <Clock aria-hidden size={12} />
            <span>
              {t('events.myEvents.pendingAutoCloseIn', {
                time: formatRelativeTime(event.autoCloseAt, locale),
              })}
            </span>
          </span>
        ) : null}
      </div>

      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{event.title}</h3>
          <span className={styles.meta}>
            <span>{dateTimeLabel}</span>
            {event.theme ? <span className={styles.theme}>{event.theme}</span> : null}
          </span>
        </div>
        {event.isCreator ? (
          <span className={styles.badgeHost}>{t('events.myEvents.hostBadge')}</span>
        ) : null}
      </div>

      <p className={styles.description}>
        {t(event.isCreator ? 'events.pending.hostText' : 'events.pending.participantText')}
      </p>

      <div className={styles.footer}>
        <span className={styles.stats}>
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
              <Link to={ROUTES.eventDetail(event.slug)} className={styles.primaryAction}>
                {t('events.myEvents.pendingChooseMovieAction')}
              </Link>
              {onCloseWithoutMovie ? (
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={onCloseWithoutMovie}
                  disabled={closing}
                >
                  {t('events.wheel.closeWithoutMovieButton')}
                </button>
              ) : null}
            </>
          ) : (
            <Link to={ROUTES.eventDetail(event.slug)} className={styles.secondaryAction}>
              {t('events.myEvents.pendingViewEventAction')}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
