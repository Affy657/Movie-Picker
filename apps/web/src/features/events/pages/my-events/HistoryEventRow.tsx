import { Link } from 'react-router';
import { Crown, Film, Star } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { formatShortDate } from '@/shared/utils/formatMyEventsListDate';
import { formatRating } from '@/shared/utils/formatRating';
import EventCardMenu from '@/features/events/components/EventCardMenu';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { ROUTES } from '@/app/routes';
import type { MyEventSummary, MyEventWinnerMovie } from '@/features/events/types';
import { winnerPosterPaths, winnerTitles } from '@/features/events/utils/eventWinners';
import styles from './HistoryEventRow.module.css';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface HistoryEventRowProps {
  event: MyEventSummary;
  onDelete?: () => void;
  onReuse?: () => void;
}

function winnerHeadline(winners: readonly MyEventWinnerMovie[], t: Translate): string {
  const title = winners[0]?.title ?? '';
  if (winners.length <= 1) return title;
  return pluralizeCount(
    winners.length - 1,
    'events.myEvents.historyWinnerAndOthersOne',
    'events.myEvents.historyWinnerAndOthersMany',
    t,
    { title }
  );
}

function HistoryRatingLine({ event }: Readonly<{ event: MyEventSummary }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const scale = user?.ratingScale ?? 'five';
  const average = event.averageRating ?? null;
  const mine = event.myRating ?? null;
  const hasWinnerToRate = event.hasWinnerToRate === true;

  if (average === null && !hasWinnerToRate) return null;

  const averageText =
    average === null ? null : formatRating(average, scale, locale, { decimals: 1 });

  return (
    <span className={styles.rating}>
      {averageText === null ? null : (
        <span
          className={styles.average}
          title={t('events.ratings.average', { value: averageText })}
        >
          <Star aria-hidden size={ICON_SIZE.md} className={styles.star} />
          <span className={styles.averageValue}>{averageText}</span>
        </span>
      )}
      {hasWinnerToRate ? (
        <Chip tone="primary" size="sm" className={styles.toRate}>
          {t('events.ratings.toRate')}
        </Chip>
      ) : null}
      {!hasWinnerToRate && mine !== null ? (
        <span className={styles.myRating}>
          {t('events.myEvents.historyMyRating', { value: formatRating(mine, scale, locale) })}
        </span>
      ) : null}
    </span>
  );
}

export default function HistoryEventRow({
  event,
  onDelete,
  onReuse,
}: Readonly<HistoryEventRowProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const winners = event.winnerMovies ?? [];
  const firstPoster = winnerPosterPaths(winners)[0] ?? null;
  const hasWinner = winners.length > 0;

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
              width={64}
              height={96}
            />
            {winners.length > 1 ? (
              <span className={styles.posterCount} aria-hidden>
                {winners.length}
              </span>
            ) : null}
          </span>
        ) : (
          <span className={styles.posterFallback} aria-hidden>
            <Film size={ICON_SIZE.lg} />
          </span>
        )}
      </Link>

      <Link to={ROUTES.eventDetail(event.slug)} className={styles.body}>
        <div className={styles.headline}>
          <h3
            className={styles.title}
            aria-label={
              winners.length > 1
                ? t('events.myEvents.winnerMoviesLabel', { titles: winnerTitles(winners, locale) })
                : undefined
            }
          >
            {hasWinner ? winnerHeadline(winners, t) : event.title}
          </h3>
          <span className={styles.date}>{formatShortDate(event.date, locale)}</span>
        </div>
        <span className={styles.night}>
          <span className={styles.nightTitle}>
            {hasWinner ? event.title : t('events.myEvents.historyFinishedWithoutMovie')}
          </span>
          {event.isCreator ? (
            <span className={styles.hostIcon} title={t('events.myEvents.hostBadgeTitle')}>
              <Crown aria-hidden size={ICON_SIZE.sm} />
            </span>
          ) : null}
        </span>
        <HistoryRatingLine event={event} />
      </Link>

      <EventCardMenu
        className={styles.menu}
        title={event.title}
        onDelete={onDelete}
        onReuse={onReuse}
      />
    </Card>
  );
}
