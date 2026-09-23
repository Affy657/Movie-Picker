import { Check } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import Chip from '@/shared/components/Chip';
import styles from '@/shared/components/SettingsSection.module.css';

export default function AccountSavedChip({ visible }: Readonly<{ visible: boolean }>) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <span className={styles.saved} role="status" aria-live="polite">
      <Chip tone="success" size="sm" icon={Check}>
        {t('auth.account.savedChip')}
      </Chip>
    </span>
  );
}
