import { WifiOff } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import EventInfoBanner from './EventInfoBanner';

type Props = {
  onRetry: () => void;
};

export default function EventConnectionBanner({ onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <EventInfoBanner
      tone="warning"
      icon={<WifiOff size={ICON_SIZE.md} />}
      kicker={t('events.detail.unstableKicker')}
      text={t('events.detail.unstableText')}
      meta={t('events.detail.unstableMeta')}
      actions={
        <Button type="button" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
