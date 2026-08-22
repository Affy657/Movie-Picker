import { Heart } from 'lucide-react';
import Tooltip from '@/shared/components/Tooltip';
import { useTranslation } from '@/shared/i18n';
import styles from './SupporterBadge.module.css';

export default function SupporterBadge() {
  const { t } = useTranslation();
  const description = t('profile.supporter.tooltip');

  return (
    <Tooltip label={description}>
      <span className={styles.badge} role="img" tabIndex={0} aria-label={description}>
        <Heart className={styles.icon} aria-hidden focusable="false" />
        <span className={styles.label}>{t('profile.supporter.label')}</span>
      </span>
    </Tooltip>
  );
}
