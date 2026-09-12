import clsx from 'clsx';
import { Crown, Film, Trophy, Users } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { formatEventTime, formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import { formatRelativeEventDate } from '@/shared/utils/formatRelativeEventDate';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import EventDateChip from '@/features/events/components/EventDateChip';
import type { MyEventSummary } from '@/features/events/types';
import { winnerPosterPaths, winnerTitles } from '@/features/events/utils/eventWinners';
import styles from './EventSummaryCard.module.css';

export { styles as eventSummaryCardStyles };

function pluralize(
  count: number,
  oneKey: TranslationKey,
  manyKey: TranslationKey,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  vars?: Record<string, string | number>
): string {
  return count === 1 ? t(oneKey, vars) : t(manyKey, { count, ...vars });
}

export function ParticipantStat({
  count,
  maxParticipants,
  t,
}: Readonly<{
  count: number;
  maxParticipants: number | null | undefined;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}>) {
  const hasCap = typeof maxParticipants === 'number' && maxParticipants > 0;
  const countStr = hasCap ? `${count} / ${maxParticipants}` : String(count);
  const a11yLabel = hasCap
    ? pluralize(
        count,
        'events.myEvents.joinedCountWithCapOne',
        'events.myEvents.joinedCountWithCapMany',
        t,
        {
          max: maxParticipants,
        }
      )
    : pluralize(count, 'events.myEvents.joinedCountOne', 'events.myEvents.joinedCountMany', t);
  return (
    <span className={styles.participantStat}>
      <Users aria-hidden size={13} />
      <span className={styles.statValue} aria-hidden="true">
        {countStr}
      </span>
      <span className="visually-hidden">{a11yLabel}</span>
    </span>
  );
}

export function MoviesStat({
  count,
  t,
}: Readonly<{
  count: number;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}>) {
  const a11yLabel = pluralize(
    count,
    'events.myEvents.movieProposedOne',
    'events.myEvents.movieProposedMany',
    t
  );
  return (
    <span className={styles.participantStat}>
      <Film aria-hidden size={13} />
      <span className={styles.statValue} aria-hidden="true">
        {count}
      </span>
      <span className="visually-hidden">{a11yLabel}</span>
    </span>
  );
}

export function HostBadge({ t }: Readonly<{ t: (key: TranslationKey) => string }>) {
  return (
    <span className={styles.badgeHost}>
      <Crown aria-hidden size={12} />
      <span className={styles.badgeHostLabel}>{t('events.myEvents.hostBadge')}</span>
    </span>
  );
}

interface EventSummaryCardBodyProps {
  event: MyEventSummary;
  variant?: 'list' | 'picker';
}

export function EventSummaryCardBody({
  event,
  variant = 'list',
}: Readonly<EventSummaryCardBodyProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const winners = event.winnerMovies ?? [];
  const winnerPosters = winnerPosterPaths(winners);
  const winnersLabel =
    winners.length === 1
      ? winners[0]!.title
      : t('events.myEvents.winnerMoviesCount', { count: winners.length });
  const lifecycle = normalizeMyEventLifecycle(event.lifecycle);
  const dateLabel = formatMyEventsListDate(event.date, locale);

  if (variant === 'picker') {
    return (
      <>
        <span className={styles.rowTop}>
          <span className={styles.title}>{event.title}</span>
          {event.isCreator ? <HostBadge t={t} /> : null}
        </span>
        {event.theme ? <span className={styles.cardTheme}>{event.theme}</span> : null}
        {winners.length > 0 ? (
          <span
            className={styles.winnerRow}
            aria-label={t('events.myEvents.winnerMoviesLabel', {
              titles: winnerTitles(winners, locale),
            })}
          >
            {winnerPosters.length > 0 ? (
              winnerPosters.map((posterPath) => (
                <img
                  key={posterPath}
                  src={posterImageSrc(posterPath)}
                  alt=""
                  aria-hidden
                  className={styles.winnerPoster}
                  width={28}
                  height={42}
                />
              ))
            ) : (
              <Trophy aria-hidden size={13} className={styles.winnerIcon} />
            )}
            <span className={styles.winnerTitle} aria-hidden="true">
              {winnersLabel}
            </span>
          </span>
        ) : null}
        <div
          className={clsx(styles.linkFooter, winners.length > 0 && styles.linkFooterAfterWinner)}
        >
          <span className={styles.cardStats}>
            <ParticipantStat
              count={event.participantCount ?? 0}
              maxParticipants={event.maxParticipants}
              t={t}
            />
            <MoviesStat count={event.movieCount ?? 0} t={t} />
          </span>
          <span className={styles.metaRight}>
            <span className={styles.meta}>
              {formatEventTime(event.time)} – {dateLabel}
            </span>
          </span>
        </div>
      </>
    );
  }

  const isLive = lifecycle === 'live';

  return (
    <div className={styles.listRow}>
      <EventDateChip date={event.date} live={isLive} />
      <div className={styles.listBody}>
        <span className={styles.rowTop}>
          <span className={styles.title}>{event.title}</span>
          {event.isCreator ? <HostBadge t={t} /> : null}
        </span>
        {event.theme ? <span className={styles.cardTheme}>{event.theme}</span> : null}
        <div className={styles.listFooter}>
          {isLive ? (
            <EventLifecyclePill lifecycle={lifecycle} />
          ) : (
            <span className={styles.relativeDatePill}>
              {formatRelativeEventDate(event.date, locale)}
            </span>
          )}
          <span className={styles.timeValue}>{formatEventTime(event.time)}</span>
          <span className={clsx(styles.cardStats, styles.listStats)}>
            <ParticipantStat
              count={event.participantCount ?? 0}
              maxParticipants={event.maxParticipants}
              t={t}
            />
            <MoviesStat count={event.movieCount ?? 0} t={t} />
          </span>
        </div>
      </div>
    </div>
  );
}
