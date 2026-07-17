import clsx from 'clsx';
import { Crown, Film, Trophy, Users } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { formatEventTime, formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import type { MyEventLifecycle } from '@/shared/types/event';
import type { MyEventSummary } from '@/features/events/types';
import styles from './EventSummaryCard.module.css';

export { styles as eventSummaryCardStyles };

const badgeClassMap: Record<string, string | undefined> = {
  upcoming: styles.badgeUpcoming,
  live: styles.badgeLive,
  finished: styles.badgeFinished,
};

function lifecycleTranslationKey(l: MyEventLifecycle): TranslationKey {
  switch (l) {
    case 'upcoming':
      return 'events.lifecycle.upcoming';
    case 'live':
      return 'events.lifecycle.live';
    case 'finished':
      return 'events.lifecycle.finished';
    default:
      return 'events.lifecycle.finished';
  }
}

function ParticipantStat({
  count,
  maxParticipants,
}: Readonly<{ count: number; maxParticipants: number | null | undefined }>) {
  const hasCap = typeof maxParticipants === 'number' && maxParticipants > 0;
  const countStr = hasCap ? `${count} / ${maxParticipants}` : String(count);
  return (
    <span className={styles.participantStat}>
      <Users aria-hidden size={13} />
      {countStr}
    </span>
  );
}

function MoviesStat({ count }: Readonly<{ count: number }>) {
  return (
    <span className={styles.participantStat}>
      <Film aria-hidden size={13} />
      {count}
    </span>
  );
}

interface EventSummaryCardBodyProps {
  event: MyEventSummary;
  showLifecycleBadge?: boolean;
}

export function EventSummaryCardBody({
  event,
  showLifecycleBadge = true,
}: Readonly<EventSummaryCardBodyProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const lifecycle = normalizeMyEventLifecycle(event.lifecycle);
  const badgeClass = badgeClassMap[lifecycle] ?? '';
  const dateLabel = formatMyEventsListDate(event.date, locale);

  return (
    <>
      <span className={styles.rowTop}>
        <span className={styles.title}>{event.title}</span>
        {event.isCreator ? (
          <span
            className={styles.badgeHost}
            title={t('events.myEvents.hostBadgeTitle')}
            aria-label={t('events.myEvents.hostBadge')}
          >
            <Crown aria-hidden size={14} />
          </span>
        ) : null}
      </span>
      {event.theme ? <span className={styles.cardTheme}>{event.theme}</span> : null}
      {event.winnerMovieTitle ? (
        <span className={styles.winnerRow}>
          {event.winnerMoviePosterPath ? (
            <img
              src={posterImageSrc(event.winnerMoviePosterPath)}
              alt=""
              aria-hidden
              className={styles.winnerPoster}
              width={28}
              height={42}
            />
          ) : (
            <Trophy aria-hidden size={13} className={styles.winnerIcon} />
          )}
          <span className={styles.winnerTitle}>{event.winnerMovieTitle}</span>
        </span>
      ) : null}
      <div
        className={clsx(styles.linkFooter, event.winnerMovieTitle && styles.linkFooterAfterWinner)}
      >
        <span className={styles.cardStats}>
          <ParticipantStat
            count={event.participantCount ?? 0}
            maxParticipants={event.maxParticipants}
          />
          <MoviesStat count={event.movieCount ?? 0} />
        </span>
        <span className={styles.metaRight}>
          {showLifecycleBadge && lifecycle !== 'upcoming' ? (
            <span className={clsx(styles.lifecyclePill, badgeClass)}>
              {t(lifecycleTranslationKey(lifecycle))}
            </span>
          ) : null}
          <span className={styles.meta}>
            {formatEventTime(event.time)} – {dateLabel}
          </span>
        </span>
      </div>
    </>
  );
}
