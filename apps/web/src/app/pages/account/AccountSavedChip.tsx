import { Check } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from '@/shared/components/SettingsSection.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

export default function AccountSavedChip({ visible }: Readonly<{ visible: boolean }>) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <span className={styles.saved} role="status" aria-live="polite">
      <Check size={ICON_SIZE.sm} aria-hidden />
      <span>{t('auth.account.savedChip')}</span>
    </span>
  );
}
