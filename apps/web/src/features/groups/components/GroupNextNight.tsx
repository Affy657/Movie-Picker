import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Film, LogIn, Plus, Vote } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Button, { buttonClass, withNudgedText } from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useLocale, useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatEventDateLong, formatEventTime } from '@/shared/utils/formatMyEventsListDate';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import EventDateBlock from '@/features/events/components/EventDateBlock';
import type { MyEventSummary } from '@/features/events/types';
import { eventCountdownLabel } from '@/features/events/utils/eventCountdownLabel';
import type { FriendGroupDetail, FriendGroupMember } from '@/features/groups/api/groupsApi';
import { useJoinGroupNight } from '@/features/groups/hooks/useGroups';
import { peoplePhrase, personName, viewerFirst } from '@/features/groups/utils/groupLabels';
import styles from './GroupNextNight.module.css';

const STRIP_POSTERS = 5;
const NAMED_COMING = 5;
const NAMED_MISSING = 3;
const STACKED_FACES = 5;

function NightPill({ night }: Readonly<{ night: MyEventSummary }>) {
  const { t } = useTranslation();
  const lifecycle = normalizeMyEventLifecycle(night.lifecycle);
  const countdown =
    lifecycle === 'upcoming'
      ? eventCountdownLabel(night.date, night.time, Date.now(), t, { daysOnly: true })
      : null;
  return (
    <EventLifecyclePill
      lifecycle={lifecycle}
      label={
        countdown
          ? t('groups.page.startsAt', { time: formatEventTime(night.time), countdown })
          : undefined
      }
    />
  );
}

function PosterStrip({ night }: Readonly<{ night: MyEventSummary }>) {
  const { t } = useTranslation();
  const movies = night.topMovies.slice(0, STRIP_POSTERS);
  if (movies.length === 0) return null;
  return (
    <ul className={styles.strip} aria-label={t('groups.page.proposedFilms')}>
      {movies.map((movie, index) => {
        const src = posterImageSrc(movie.posterPath);
        return (
          <li key={`${index}-${movie.title}`} className={styles.film}>
            <span className={styles.poster}>
              {src ? (
                <img src={src} alt="" className={styles.image} loading="lazy" decoding="async" />
              ) : (
                <Film size={ICON_SIZE.xl} aria-hidden />
              )}
            </span>
            <span className="visually-hidden">{movie.title}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Presence({
  group,
  viewerId,
}: Readonly<{ group: FriendGroupDetail; viewerId: string | undefined }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isMobile = useIsMobile();
  const ids = new Set(group.nextNightParticipantIds);
  const coming = viewerFirst(
    group.members.filter((member) => ids.has(member.userId)),
    viewerId
  );
  const missing = group.members.filter((member) => !ids.has(member.userId));
  if (coming.length === 0) return <p className={styles.presence}>{t('groups.page.nobodyYet')}</p>;

  const nameOf = (member: FriendGroupMember) => personName(member, viewerId, t);
  let comingText: string;
  if (isMobile) {
    comingText = pluralizeCount(
      coming.length,
      'groups.page.comingCountOne',
      'groups.page.comingCount',
      t,
      { total: group.members.length }
    );
  } else if (coming.length === 1 && coming[0]?.userId === viewerId) {
    comingText = t('groups.page.comingYou');
  } else {
    comingText = pluralizeCount(coming.length, 'groups.page.comingOne', 'groups.page.coming', t, {
      names: peoplePhrase(coming.map(nameOf), coming.length, NAMED_COMING, locale, t),
    });
  }
  const missingText =
    missing.length === 0
      ? null
      : pluralizeCount(missing.length, 'groups.page.missingOne', 'groups.page.missing', t, {
          names: peoplePhrase(missing.map(nameOf), missing.length, NAMED_MISSING, locale, t),
        });

  return (
    <p className={styles.presence}>
      <AvatarStack
        people={coming.map((member) => ({
          key: member.userId,
          avatarId: member.avatarId,
          pseudo: member.displayName,
        }))}
        max={STACKED_FACES}
        size="sm"
        className={styles.faces}
      />
      <span className={styles.coming}>{comingText}</span>
      {missingText ? <span className={styles.missing}>{missingText}</span> : null}
    </p>
  );
}

function NightActions({ night }: Readonly<{ night: MyEventSummary }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const joinNight = useJoinGroupNight();
  const [error, setError] = useState<string | null>(null);
  const to = ROUTES.eventDetail(night.slug);

  const join = () => {
    setError(null);
    joinNight.mutate(night.slug, {
      onSuccess: () => void navigate(to),
      onError: (err) => setError(getErrorMessage(err, t('groups.page.joinError'))),
    });
  };

  const hasFilms = (night.movieCount ?? 0) > 0;

  return (
    <div className={styles.actions}>
      {error ? (
        <p className={`error ${styles.error}`} role="alert">
          {error}
        </p>
      ) : null}
      {night.isParticipant ? (
        <>
          {hasFilms ? (
            <Link to={to} className={buttonClass({ variant: 'primary' })}>
              {withNudgedText([
                <Vote key="icon" size={ICON_SIZE.md} aria-hidden />,
                t('groups.page.vote'),
              ])}
            </Link>
          ) : null}
          <Link
            to={to}
            state={{ openPropose: true }}
            className={buttonClass({ variant: hasFilms ? 'secondary' : 'primary' })}
          >
            {withNudgedText([
              <Plus key="icon" size={ICON_SIZE.md} aria-hidden />,
              t('groups.page.propose'),
            ])}
          </Link>
        </>
      ) : (
        <Button
          variant="primary"
          loading={joinNight.isPending}
          aria-label={t('groups.page.joinAria', { title: night.title })}
          onClick={join}
        >
          <LogIn size={ICON_SIZE.md} aria-hidden />
          {t('groups.page.join')}
        </Button>
      )}
    </div>
  );
}

export default function GroupNextNight({
  night,
  group,
  viewerId,
}: Readonly<{ night: MyEventSummary; group: FriendGroupDetail; viewerId: string | undefined }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const theme = night.theme?.trim();

  return (
    <Card as="article" padding="none" radius="lg" elevation="sm" className={styles.card}>
      <div className={styles.top}>
        <EventDateBlock date={night.date} className={styles.date} />
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.info}>
          <h3 className={styles.title}>
            <Link to={ROUTES.eventDetail(night.slug)} className={styles.titleLink}>
              {night.title}
            </Link>
          </h3>
          <span className="visually-hidden">
            {formatEventDateLong(night.date, night.time, locale, t('events.detail.dateTimeJoiner'))}
          </span>
          <div className={styles.facts}>
            <NightPill night={night} />
            {theme ? <span>{theme}</span> : null}
            {night.isCreator ? <span>{t('groups.page.organizedByYou')}</span> : null}
          </div>
        </div>
      </div>
      <PosterStrip night={night} />
      <Presence group={group} viewerId={viewerId} />
      <NightActions night={night} />
    </Card>
  );
}
