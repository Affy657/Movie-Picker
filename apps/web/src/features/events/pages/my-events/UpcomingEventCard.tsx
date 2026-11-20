import { Link } from 'react-router';
import { LogIn, Plus, Vote } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import EventCardMenu from '@/features/events/components/EventCardMenu';
import EventDateBlock from '@/features/events/components/EventDateBlock';
import PosterFan, { POSTER_FAN_MAX } from '@/features/movies/components/PosterFan';
import { eventCountdownLabel } from '@/features/events/utils/eventCountdownLabel';
import { participantsCountLabel } from '@/features/events/utils/eventLabels';
import type { MyEventMoviePreview, MyEventSummary } from '@/features/events/types';
import AvatarStack from '@/shared/components/AvatarStack';
import Card from '@/shared/components/Card';
import PosterBackdrop from '@/shared/components/PosterBackdrop';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatEventDateLong } from '@/shared/utils/formatMyEventsListDate';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import styles from './UpcomingEventCard.module.css';

export function upcomingCardPosters(event: MyEventSummary): MyEventMoviePreview[] {
  const winners = event.winnerMovies ?? [];
  const winnerTitles = new Set(winners.map((movie) => movie.title));
  const others = (event.topMovies ?? []).filter((movie) => !winnerTitles.has(movie.title));
  return [...winners, ...others].slice(0, POSTER_FAN_MAX);
}

type CardStatus = 'join' | 'vote' | 'proposeFirst' | 'live' | 'countdown';

export function upcomingCardStatus(event: MyEventSummary): CardStatus {
  if (!event.isParticipant && event.groupId) return 'join';
  const lifecycle = normalizeMyEventLifecycle(event.lifecycle);
  if (lifecycle === 'live') return 'live';
  const movieCount = event.movieCount ?? 0;
  const hasWinner = (event.winnerMovies?.length ?? 0) > 0;
  if (event.isParticipant && movieCount === 0) return 'proposeFirst';
  if (event.isParticipant && !hasWinner && event.hasVoted === false) return 'vote';
  return 'countdown';
}

const CARD_ACTIONS = {
  join: { Icon: LogIn, label: 'events.myEvents.cardActionJoin' },
  vote: { Icon: Vote, label: 'events.myEvents.cardActionVote' },
  proposeFirst: { Icon: Plus, label: 'events.myEvents.cardActionProposeFirst' },
} as const;

export type UpcomingNightStatusClassNames = {
  status?: string;
  action?: string;
  actionIcon?: string;
};

export function UpcomingNightStatus({
  event,
  classNames,
}: Readonly<{ event: MyEventSummary; classNames: UpcomingNightStatusClassNames }>) {
  const { t } = useTranslation();
  const status = upcomingCardStatus(event);
  if (status === 'live')
    return <EventLifecyclePill variant="text" lifecycle="live" className={classNames.status} />;
  if (status === 'join' || status === 'vote' || status === 'proposeFirst') {
    const { Icon, label } = CARD_ACTIONS[status];
    return (
      <span className={classNames.action}>
        <Icon size={ICON_SIZE.sm} aria-hidden className={classNames.actionIcon} />
        {t(label)}
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
      className={classNames.status}
    />
  );
}

const CARD_STATUS_CLASSES: UpcomingNightStatusClassNames = {
  status: styles.status,
  action: styles.action,
  actionIcon: styles.actionIcon,
};

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
  eyebrow?: string;
};

export default function UpcomingEventCard({
  event,
  onLeave,
  eyebrow,
}: Readonly<UpcomingEventCardProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const preview = event.participantsPreview ?? [];
  const hidden = Math.max((event.participantCount ?? 0) - preview.length, 0);
  const theme = event.theme?.trim();
  const posters = upcomingCardPosters(event);
  const overline = eyebrow ?? event.groupName ?? null;

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
        data-compact={eyebrow ? true : undefined}
      >
        <PosterBackdrop posterPath={posters[0]?.posterPath} glow />
        <EventDateBlock date={event.date} />
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.main}>
          {overline ? <span className={styles.eyebrow}>{overline}</span> : null}
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
          <UpcomingNightStatus event={event} classNames={CARD_STATUS_CLASSES} />
        </span>
        <PosterFan
          layout="spread"
          srcs={posters.map((poster) => posterImageSrc(poster.posterPath))}
        />
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
