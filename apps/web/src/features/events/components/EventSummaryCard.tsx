import clsx from 'clsx';
import { Clock, Crown, Film, Trophy, Users } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import type { MyEventLifecycle } from '@/shared/types/event';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import {
  daysUntilEventDate,
  formatRelativeEventDate,
} from '@/shared/utils/formatRelativeEventDate';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import EventDateChip, { type EventDateChipTone } from '@/features/events/components/EventDateChip';
import type { MyEventSummary } from '@/features/events/types';
import { winnerPosterPaths, winnerTitles } from '@/features/events/utils/eventWinners';
import styles from './EventSummaryCard.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

export { styles as eventSummaryCardStyles };

const SOON_DAYS = 7;

function pluralize(
  count: number,
  oneKey: TranslationKey,
  manyKey: TranslationKey,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  vars?: Record<string, string | number>
): string {
  return count === 1 ? t(oneKey, vars) : t(manyKey, { count, ...vars });
}

export function isEventSoon(date: string, lifecycle: MyEventLifecycle): boolean {
  if (lifecycle !== 'upcoming') return false;
  const days = daysUntilEventDate(date);
  return days !== null && days >= 0 && days <= SOON_DAYS;
}

export function eventDateChipTone(date: string, lifecycle: MyEventLifecycle): EventDateChipTone {
  if (lifecycle === 'live') return 'live';
  if (lifecycle === 'pending') return 'pending';
  return isEventSoon(date, lifecycle) ? 'soon' : 'default';
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
      <Users aria-hidden size={ICON_SIZE.sm} />
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
      <Film aria-hidden size={ICON_SIZE.sm} />
      <span className={styles.statValue} aria-hidden="true">
        {count}
      </span>
      <span className="visually-hidden">{a11yLabel}</span>
    </span>
  );
}

export function HostBadge({ t }: Readonly<{ t: (key: TranslationKey) => string }>) {
  return (
    <span className={styles.role} title={t('events.myEvents.hostBadgeTitle')}>
      <Crown aria-hidden size={ICON_SIZE.xs} />
      <span className={styles.roleText}>{t('events.myEvents.hostBadge')}</span>
    </span>
  );
}

export function EventCardMeta({
  event,
  lifecycle,
}: Readonly<{ event: MyEventSummary; lifecycle: MyEventLifecycle }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const soon = isEventSoon(event.date, lifecycle);
  return (
    <span className={styles.metaGroup}>
      {lifecycle === 'live' ? (
        <EventLifecyclePill lifecycle="live" />
      ) : (
        <span className={clsx(styles.when, soon && styles.whenSoon)}>
          <Clock aria-hidden size={ICON_SIZE.xs} />
          <span className={styles.whenText}>{formatRelativeEventDate(event.date, locale)}</span>
        </span>
      )}
      {event.isCreator ? (
        <>
          <span className={styles.metaSeparator} aria-hidden />
          <HostBadge t={t} />
        </>
      ) : null}
    </span>
  );
}

function WinnerRow({ event }: Readonly<{ event: MyEventSummary }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const winners = event.winnerMovies ?? [];
  if (winners.length === 0) return null;
  const winnerPosters = winnerPosterPaths(winners);
  const winnersLabel =
    winners.length === 1
      ? winners[0]!.title
      : t('events.myEvents.winnerMoviesCount', { count: winners.length });
  return (
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
        <Trophy aria-hidden size={ICON_SIZE.sm} className={styles.winnerIcon} />
      )}
      <span className={styles.winnerTitle} aria-hidden="true">
        {winnersLabel}
      </span>
    </span>
  );
}

export function EventSummaryCardBody({ event }: Readonly<{ event: MyEventSummary }>) {
  const { t } = useTranslation();
  const lifecycle = normalizeMyEventLifecycle(event.lifecycle);

  return (
    <div className={styles.row}>
      <EventDateChip
        date={event.date}
        time={event.time}
        tone={eventDateChipTone(event.date, lifecycle)}
      />
      <div className={styles.body}>
        <span className={styles.title}>{event.title}</span>
        {event.theme ? <span className={styles.cardTheme}>{event.theme}</span> : null}
        <WinnerRow event={event} />
        <div className={styles.footer}>
          <EventCardMeta event={event} lifecycle={lifecycle} />
          <span className={styles.cardStats}>
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
