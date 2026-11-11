import { Link } from 'react-router';
import { Plus, Vote } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import EventCardMenu from '@/features/events/components/EventCardMenu';
import EventDateBlock from '@/features/events/components/EventDateBlock';
import PosterFan, {
  POSTER_FAN_MAX,
  type PosterFanItem,
} from '@/features/events/components/PosterFan';
import { eventCountdownLabel } from '@/features/events/utils/eventCountdownLabel';
import { participantsCountLabel } from '@/features/events/utils/eventLabels';
import type { MyEventSummary } from '@/features/events/types';
import AvatarStack from '@/shared/components/AvatarStack';
import Card from '@/shared/components/Card';
import PosterBackdrop from '@/shared/components/PosterBackdrop';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatEventDateLong } from '@/shared/utils/formatMyEventsListDate';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import styles from './UpcomingEventCard.module.css';

export function upcomingCardPosters(event: MyEventSummary): PosterFanItem[] {
  const winners = event.winnerMovies ?? [];
  const winnerTitles = new Set(winners.map((movie) => movie.title));
  const others = (event.topMovies ?? []).filter((movie) => !winnerTitles.has(movie.title));
  return [...winners, ...others].slice(0, POSTER_FAN_MAX);
}

type CardStatus = 'vote' | 'proposeFirst' | 'live' | 'countdown';

export function upcomingCardStatus(event: MyEventSummary): CardStatus {
  const lifecycle = normalizeMyEventLifecycle(event.lifecycle);
  if (lifecycle === 'live') return 'live';
  const movieCount = event.movieCount ?? 0;
  const hasWinner = (event.winnerMovies?.length ?? 0) > 0;
  if (event.isParticipant && movieCount === 0) return 'proposeFirst';
  if (event.isParticipant && !hasWinner && event.hasVoted === false) return 'vote';
  return 'countdown';
}

function CardStatusLine({ event, t }: Readonly<{ event: MyEventSummary; t: Translate }>) {
  const status = upcomingCardStatus(event);
  if (status === 'live')
    return <EventLifecyclePill variant="text" lifecycle="live" className={styles.status} />;
  if (status === 'vote' || status === 'proposeFirst') {
    const Icon = status === 'vote' ? Vote : Plus;
    return (
      <span className={styles.action}>
        <Icon size={ICON_SIZE.sm} aria-hidden className={styles.actionIcon} />
        {status === 'vote'
          ? t('events.myEvents.cardActionVote')
          : t('events.myEvents.cardActionProposeFirst')}
      </span>
    );
  }
  const countdown = eventCountdownLabel(event.date, event.time, Date.now(), t, { daysOnly: true });
  if (!countdown) return null;
  return (
    <EventLifecyclePill
      variant="text"
      lifecycle="upcoming"
      label={t('events.lifecycle.startsIn')}
      detail={countdown}
      className={styles.status}
    />
  );
}

function peopleLine(event: MyEventSummary, t: Translate): string {
  const participants = participantsCountLabel(event.participantCount ?? 0, t);
  const movieCount = event.movieCount ?? 0;
  if (movieCount === 0) return participants;
  const movies = pluralizeCount(
    movieCount,
    'events.detail.moviesCountOne',
    'events.detail.moviesCount',
    t
  );
  return `${participants}, ${movies}`;
}

type UpcomingEventCardProps = {
  event: MyEventSummary;
  onLeave?: () => void;
};

export default function UpcomingEventCard({ event, onLeave }: Readonly<UpcomingEventCardProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const preview = event.participantsPreview ?? [];
  const hidden = Math.max((event.participantCount ?? 0) - preview.length, 0);
  const theme = event.theme?.trim();
  const posters = upcomingCardPosters(event);

  return (
    <div className={styles.wrap}>
      <Card
        as={Link}
        to={ROUTES.eventDetail(event.slug)}
        interactive
        elevation="sm"
        padding="none"
        className={styles.card}
        data-with-menu={onLeave ? true : undefined}
      >
        <PosterBackdrop posterPath={posters[0]?.posterPath} glow />
        <EventDateBlock date={event.date} />
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.main}>
          <span className={styles.title}>{event.title}</span>
          <span className="visually-hidden">
            {formatEventDateLong(event.date, event.time, locale, t('events.detail.dateTimeJoiner'))}
          </span>
          {theme ? <span className={styles.theme}>{theme}</span> : null}
          <span className={styles.people}>
            {preview.length > 0 ? (
              <AvatarStack
                className={styles.avatars}
                people={preview.map((person, index) => ({
                  key: `${index}-${person.pseudo}`,
                  avatarId: person.avatarId,
                  pseudo: person.pseudo,
                }))}
                max={preview.length}
                hidden={hidden}
                size="xs"
              />
            ) : null}
            <span>{peopleLine(event, t)}</span>
          </span>
          <CardStatusLine event={event} t={t} />
        </span>
        <PosterFan posters={posters} />
      </Card>
      {onLeave ? (
        <EventCardMenu
          title={event.title}
          className={styles.menu}
          onRemove={onLeave}
          removeLabel={t('events.participants.leaveAction')}
        />
      ) : null}
    </div>
  );
}
