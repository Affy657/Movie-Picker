import { Share2 } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './EventShareButton.module.css';
import Button from '@/shared/components/Button';

interface EventShareButtonProps {
  condensed?: boolean;
  onClick: () => void;
}

export default function EventShareButton({ condensed, onClick }: Readonly<EventShareButtonProps>) {
  const { t } = useTranslation();
  const label = t('share.trigger');

  return (
    <Button
      type="button"
      className={styles.trigger}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={condensed ? label : undefined}
      title={condensed ? label : undefined}
    >
      <Share2 size={16} aria-hidden />
      {!condensed ? <span className={styles.triggerLabel}>{label}</span> : null}
    </Button>
  );
}
