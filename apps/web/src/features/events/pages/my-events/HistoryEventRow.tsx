import { Link } from 'react-router';
import { Crown, Film, Star } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { formatEventDateLong } from '@/shared/utils/formatMyEventsListDate';
import { formatRating } from '@/shared/utils/formatRating';
import EventCardMenu from '@/features/events/components/EventCardMenu';
import EventDateBlock from '@/features/events/components/EventDateBlock';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { ROUTES } from '@/app/routes';
import type { MyEventSummary, MyEventWinnerMovie } from '@/features/events/types';
import styles from './HistoryEventRow.module.css';
import Card from '@/shared/components/Card';
import PosterBackdrop from '@/shared/components/PosterBackdrop';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface HistoryEventRowProps {
  event: MyEventSummary;
  onDelete?: () => void;
  onReuse?: () => void;
}

function winnerKicker(winners: readonly MyEventWinnerMovie[], t: Translate): string {
  if (winners.length === 0) return t('events.myEvents.historyFinishedWithoutMovie');
  return pluralizeCount(
    winners.length,
    'events.myEvents.cardWinnerOne',
    'events.myEvents.cardWinnerMany',
    t
  );
}

function winnerHeadline(winners: readonly MyEventWinnerMovie[], t: Translate): string {
  const title = winners[0]?.title ?? '';
  if (winners.length <= 1) return title;
  return pluralizeCount(
    winners.length - 1,
    'events.myEvents.cardWinnerAndOthersOne',
    'events.myEvents.cardWinnerAndOthersMany',
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

  if (average === null && !hasWinnerToRate && !event.isCreator) return null;

  const averageText =
    average === null ? null : formatRating(average, scale, locale, { decimals: 1 });

  return (
    <span className={styles.rating}>
      {averageText === null ? null : (
        <span
          className={styles.average}
          title={t('events.ratings.average', { value: averageText })}
        >
          <Star aria-hidden size={ICON_SIZE.sm} className={styles.star} />
          <span className={styles.averageValue}>{averageText}</span>
        </span>
      )}
      {hasWinnerToRate ? <span className={styles.toRate}>{t('events.ratings.toRate')}</span> : null}
      {!hasWinnerToRate && mine !== null ? (
        <span>
          {t('events.myEvents.historyMyRating', { value: formatRating(mine, scale, locale) })}
        </span>
      ) : null}
      {event.isCreator ? (
        <span className={styles.host} title={t('events.myEvents.hostBadgeTitle')}>
          <Crown aria-hidden size={ICON_SIZE.sm} className={styles.hostIcon} />
          {t('events.myEvents.hostBadge')}
        </span>
      ) : null}
    </span>
  );
}

function WinnerPosters({ winners }: Readonly<{ winners: readonly MyEventWinnerMovie[] }>) {
  if (winners.length === 0) {
    return (
      <span className={styles.posters} aria-hidden="true">
        <span className={`${styles.poster} ${styles.noMovie}`}>
          <Film size={ICON_SIZE.lg} />
        </span>
      </span>
    );
  }
  return (
    <span className={styles.posters} aria-hidden="true">
      {winners.slice(0, 2).map((movie, index) => {
        const src = posterImageSrc(movie.posterPath);
        return (
          <span
            key={`${index}-${movie.title}`}
            className={`${styles.poster} ${index === 0 ? styles.front : styles.back}`}
          >
            {src ? (
              <img src={src} alt="" className={styles.image} loading="lazy" decoding="async" />
            ) : (
              <Film size={ICON_SIZE.lg} />
            )}
          </span>
        );
      })}
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
  const hasMenu = !!onDelete || !!onReuse;

  return (
    <article className={styles.wrap}>
      <Card
        as={Link}
        to={ROUTES.eventDetail(event.slug)}
        interactive
        elevation="sm"
        padding="none"
        className={styles.card}
        data-with-menu={hasMenu || undefined}
      >
        <PosterBackdrop posterPath={winners[0]?.posterPath} glow />
        <EventDateBlock date={event.date} />
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.main}>
          <h4 className={styles.title}>{event.title}</h4>
          <span className="visually-hidden">
            {formatEventDateLong(event.date, event.time, locale, t('events.detail.dateTimeJoiner'))}
          </span>
          <span className={styles.winner}>
            {winnerKicker(winners, t)}
            {winners.length > 0 ? (
              <span className={styles.winnerTitle}>{winnerHeadline(winners, t)}</span>
            ) : null}
          </span>
          <HistoryRatingLine event={event} />
        </span>
        <WinnerPosters winners={winners} />
      </Card>
      <EventCardMenu
        className={styles.menu}
        title={event.title}
        onDelete={onDelete}
        onReuse={onReuse}
      />
    </article>
  );
}
