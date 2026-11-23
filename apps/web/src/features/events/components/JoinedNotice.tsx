import { useEffect } from 'react';
import Notice from '@/shared/components/Notice';
import { useTranslation } from '@/shared/i18n';

const JOINED_NOTICE_MS = 8000;

export default function JoinedNotice({ onClose }: Readonly<{ onClose: () => void }>) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = globalThis.setTimeout(onClose, JOINED_NOTICE_MS);
    return () => globalThis.clearTimeout(timer);
  }, [onClose]);

  return (
    <Notice
      title={t('events.join.joinedTitle')}
      description={t('events.join.joinedDescription')}
      onClose={onClose}
    />
  );
}
