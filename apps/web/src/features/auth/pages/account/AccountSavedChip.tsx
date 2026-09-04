import { Check } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './AccountShared.module.css';

export default function AccountSavedChip({ visible }: Readonly<{ visible: boolean }>) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <span className={styles.saved} role="status" aria-live="polite">
      <Check size={13} aria-hidden />
      <span>{t('auth.account.savedChip')}</span>
    </span>
  );
}
