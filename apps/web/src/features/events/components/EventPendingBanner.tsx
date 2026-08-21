import { Clock } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import EventInfoBanner from './EventInfoBanner';

type Props = {
  isHost: boolean;
};

export default function EventPendingBanner({ isHost }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <EventInfoBanner
      tone="pending"
      icon={<Clock size={16} />}
      kicker={t('events.lifecycle.pending')}
      text={isHost ? t('events.pending.hostText') : t('events.pending.participantText')}
      meta={isHost ? t('events.pending.hostMeta') : t('events.pending.participantMeta')}
    />
  );
}
