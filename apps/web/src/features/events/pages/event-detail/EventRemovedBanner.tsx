import { UserX } from 'lucide-react';
import EventInfoBanner from '@/features/events/components/EventInfoBanner';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';

export default function EventRemovedBanner() {
  const { t } = useTranslation();
  return (
    <EventInfoBanner
      tone="warning"
      icon={<UserX size={ICON_SIZE.md} />}
      kicker={t('events.removed.kicker')}
      text={t('events.removed.text')}
      meta={t('events.removed.meta')}
    />
  );
}
