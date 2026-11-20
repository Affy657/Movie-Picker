import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, LogIn } from 'lucide-react';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { formatEventDateLong } from '@/shared/utils/formatMyEventsListDate';
import { ROUTES } from '@/app/routes';
import EventDateBlock from '@/features/events/components/EventDateBlock';
import type { MyEventSummary } from '@/features/events/types';
import { participantsCountLabel } from '@/features/events/utils/eventLabels';
import { useJoinGroupNight } from '@/features/groups/hooks/useGroups';
import styles from './GroupUpcomingNights.module.css';

function nightLine(night: MyEventSummary, t: Translate): string {
  const participants = participantsCountLabel(night.participantCount, t);
  return night.isCreator ? `${t('groups.page.organizedByYou')}, ${participants}` : participants;
}

function NightText({ night }: Readonly<{ night: MyEventSummary }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  return (
    <>
      <EventDateBlock date={night.date} className={styles.date} />
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.text}>
        <span className={styles.title}>{night.title}</span>
        <span className="visually-hidden">
          {formatEventDateLong(night.date, night.time, locale, t('events.detail.dateTimeJoiner'))}
        </span>
        <span className={styles.line}>{nightLine(night, t)}</span>
      </span>
    </>
  );
}

function JoinableNight({ night }: Readonly<{ night: MyEventSummary }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const joinNight = useJoinGroupNight();
  const [error, setError] = useState<string | null>(null);

  const join = () => {
    setError(null);
    joinNight.mutate(night.slug, {
      onSuccess: () => void navigate(ROUTES.eventDetail(night.slug)),
      onError: (err) => setError(getErrorMessage(err, t('groups.page.joinError'))),
    });
  };

  return (
    <Card padding="none" radius="lg" className={styles.row}>
      <NightText night={night} />
      <Button
        size="sm"
        loading={joinNight.isPending}
        aria-label={t('groups.page.joinAria', { title: night.title })}
        onClick={join}
      >
        <LogIn size={ICON_SIZE.sm} aria-hidden />
        {t('groups.page.join')}
      </Button>
      {error ? (
        <p className={`error ${styles.error}`} role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

export default function GroupUpcomingNights({
  nights,
}: Readonly<{ nights: readonly MyEventSummary[] }>) {
  return (
    <ul className={styles.list}>
      {nights.map((night) => (
        <li key={night.id}>
          {night.isParticipant ? (
            <Card
              as={Link}
              to={ROUTES.eventDetail(night.slug)}
              interactive
              padding="none"
              radius="lg"
              className={styles.row}
            >
              <NightText night={night} />
              <ChevronRight size={ICON_SIZE.md} aria-hidden className={styles.chevron} />
            </Card>
          ) : (
            <JoinableNight night={night} />
          )}
        </li>
      ))}
    </ul>
  );
}
