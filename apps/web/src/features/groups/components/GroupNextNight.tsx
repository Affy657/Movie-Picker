import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Film, LogIn, Plus, Vote } from 'lucide-react';
import Button, { buttonClass, withNudgedText } from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatEventDateLong, formatEventTime } from '@/shared/utils/formatMyEventsListDate';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import EventDateBlock from '@/features/events/components/EventDateBlock';
import type { MyEventSummary } from '@/features/events/types';
import { eventCountdownLabel } from '@/features/events/utils/eventCountdownLabel';
import { useJoinGroupNight } from '@/features/groups/hooks/useGroups';
import styles from './GroupNextNight.module.css';

const STRIP_POSTERS = 5;

function attendanceLabel(coming: number, total: number, t: Translate): string {
  if (coming === 0) return t('groups.page.attendanceNone');
  return pluralizeCount(coming, 'groups.page.attendanceOne', 'groups.page.attendance', t, {
    total,
  });
}

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
            <span className={styles.filmTitle}>{movie.title}</span>
          </li>
        );
      })}
    </ul>
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
    <>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
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
        <Link to={to} className={styles.openLink}>
          {t('groups.page.open')}
        </Link>
      </div>
    </>
  );
}

export default function GroupNextNight({
  night,
  coming,
  total,
}: Readonly<{ night: MyEventSummary; coming: number; total: number }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const theme = night.theme?.trim();

  return (
    <Card padding="none" radius="lg" elevation="sm" className={styles.card}>
      <div className={styles.top}>
        <EventDateBlock date={night.date} />
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.info}>
          <h3 className={styles.title}>{night.title}</h3>
          <span className="visually-hidden">
            {formatEventDateLong(night.date, night.time, locale, t('events.detail.dateTimeJoiner'))}
          </span>
          <div className={styles.facts}>
            <NightPill night={night} />
            {theme ? <span>{theme}</span> : null}
            <span>{attendanceLabel(coming, total, t)}</span>
          </div>
        </div>
      </div>
      <PosterStrip night={night} />
      <NightActions night={night} />
    </Card>
  );
}
