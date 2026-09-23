import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import clsx from 'clsx';
import AvatarStack from '@/shared/components/AvatarStack';
import EventShareButton from '@/features/events/components/EventShareButton';
import EventThemeBanner from '@/features/events/components/EventThemeBanner';
import EventShareDialog from '@/features/events/pages/event-detail/EventShareDialog';
import { nightRecapFrontendUrl } from '@/features/events/api/eventsApi';
import { ROUTES } from '@/app/routes';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useEverOpened } from '@/shared/hooks/useEverOpened';
import { useLocale, useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { participantsCountLabel } from '@/features/events/utils/eventLabels';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import {
  formatEventDateLong,
  formatEventTime,
  formatMyEventsListDate,
} from '@/shared/utils/formatMyEventsListDate';
import styles from './NightRecap.module.css';

const MAX_STACKED_AVATARS = 4;

export default function NightRecapHeader({
  event,
  winners,
}: Readonly<{ event: EventData; winners: MovieData[] }>) {
  const recapOf = winners[0] ?? null;
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const shareEverOpened = useEverOpened(shareOpen);
  const goBack = () => {
    if (globalThis.history.length > 1) navigate(-1);
    else navigate(ROUTES.home);
  };

  const participants = event.participants ?? [];
  const participantCount = event.participantCount ?? participants.length;
  const stacked = participants.slice(0, MAX_STACKED_AVATARS);
  const participantsLabel = participantsCountLabel(participantCount, t);
  const proposedLabel = pluralizeCount(
    event.movieCount ?? 0,
    'events.recap.proposedOne',
    'events.recap.proposedMany',
    t
  );
  const dateFormatted = formatEventDateLong(
    event.date,
    event.time,
    locale,
    t('events.detail.dateTimeJoiner'),
    { keepsake: true }
  );

  return (
    <>
      <div className={styles.top}>
        <button
          type="button"
          className={clsx('back-link back-link-button', styles.back)}
          onClick={goBack}
        >
          <ArrowLeft size={ICON_SIZE.md} aria-hidden />
          {t('events.detail.backNav')}
        </button>
        {recapOf ? <EventShareButton onClick={() => setShareOpen(true)} /> : null}
      </div>
      <p className={styles.eyebrow}>
        <Clapperboard size={ICON_SIZE.md} aria-hidden />
        <span className={styles.eyebrowLabel}>{t('events.recap.eyebrow')}</span>
      </p>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{event.title}</h1>
      </div>
      <div className={styles.meta}>
        <span>{dateFormatted}</span>
        <span className={styles.sep} aria-hidden />
        <span className={styles.stack}>
          <AvatarStack
            people={stacked.map((p) => ({ key: p.id, avatarId: p.avatarId, pseudo: p.pseudo }))}
            max={MAX_STACKED_AVATARS}
            hidden={Math.max(participantCount - stacked.length, 0)}
          />
          <span className={styles.stackLabel}>{participantsLabel}</span>
        </span>
        <span className={styles.sep} aria-hidden />
        <span>{proposedLabel}</span>
        <EventThemeBanner theme={event.config?.theme} />
      </div>
      {recapOf && shareEverOpened ? (
        <EventShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          slug={event.slug}
          event={event}
          shareUrl={nightRecapFrontendUrl(event.slug)}
          recap={{ winners }}
          dateFormatted={dateFormatted}
          timeFormatted={formatEventTime(event.time)}
          dateLabel={formatMyEventsListDate(event.date, locale)}
          participantsLabel={participantsLabel}
        />
      ) : null}
    </>
  );
}
