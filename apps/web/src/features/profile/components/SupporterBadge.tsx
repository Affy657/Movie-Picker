import { Heart } from 'lucide-react';
import Chip from '@/shared/components/Chip';
import Tooltip from '@/shared/components/Tooltip';
import { useTranslation } from '@/shared/i18n';
import styles from './SupporterBadge.module.css';

export default function SupporterBadge() {
  const { t } = useTranslation();
  const description = t('profile.supporter.tooltip');

  return (
    <Tooltip label={description} focusable>
      <Chip tone="primary" size="sm" icon={Heart} className={styles.badge}>
        {t('profile.supporter.label')}
      </Chip>
    </Tooltip>
  );
}
