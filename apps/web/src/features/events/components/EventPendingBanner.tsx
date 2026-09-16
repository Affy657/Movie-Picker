import { Clock, Disc3 } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import EventInfoBanner from './EventInfoBanner';

type Props = {
  isHost: boolean;
  onLaunchWheel?: () => void;
  onReschedule?: () => void;
  onCloseWithoutMovie?: () => void;
};

export default function EventPendingBanner({
  isHost,
  onLaunchWheel,
  onReschedule,
  onCloseWithoutMovie,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const actions = isHost ? (
    <>
      {onLaunchWheel ? (
        <Button type="button" variant="primary" size="sm" onClick={onLaunchWheel}>
          <Disc3 size={ICON_SIZE.sm} aria-hidden />
          {t('events.wheel.launchButton')}
        </Button>
      ) : null}
      {onReschedule ? (
        <Button type="button" size="sm" onClick={onReschedule}>
          {t('events.pending.rescheduleAction')}
        </Button>
      ) : null}
      {onCloseWithoutMovie ? (
        <Button type="button" variant="ghost" size="sm" onClick={onCloseWithoutMovie}>
          {t('events.wheel.closeWithoutMovieButton')}
        </Button>
      ) : null}
    </>
  ) : null;

  return (
    <EventInfoBanner
      tone="pending"
      icon={<Clock size={ICON_SIZE.md} />}
      kicker={t('events.lifecycle.pending')}
      text={isHost ? t('events.pending.hostText') : t('events.pending.participantText')}
      meta={isHost ? t('events.pending.hostMeta') : t('events.pending.participantMeta')}
      actions={actions}
    />
  );
}
