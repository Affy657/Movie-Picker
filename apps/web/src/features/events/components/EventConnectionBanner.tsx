import { WifiOff } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import EventInfoBanner from './EventInfoBanner';

type Props =
  { variant?: 'unstable'; onRetry: () => void } | { variant: 'offline'; onRetry?: never };

export default function EventConnectionBanner(props: Readonly<Props>) {
  const { t } = useTranslation();
  if (props.variant === 'offline') {
    return (
      <EventInfoBanner
        tone="warning"
        icon={<WifiOff size={ICON_SIZE.md} />}
        kicker={t('events.detail.offlineKicker')}
        text={t('events.detail.offlineText')}
        meta={t('events.detail.offlineMeta')}
      />
    );
  }
  return (
    <EventInfoBanner
      tone="warning"
      icon={<WifiOff size={ICON_SIZE.md} />}
      kicker={t('events.detail.unstableKicker')}
      text={t('events.detail.unstableText')}
      meta={t('events.detail.unstableMeta')}
      actions={
        <Button type="button" size="sm" onClick={props.onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
