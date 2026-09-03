import { useTranslation } from '@/shared/i18n';
import NotificationsSection from '@/features/notifications/components/NotificationsSection';
import AccountSavedChip from './AccountSavedChip';
import { useSavedFlash } from './useSavedFlash';
import styles from './AccountShared.module.css';

export default function AccountNotificationsPage() {
  const { t } = useTranslation();
  const [saved, flashSaved] = useSavedFlash();

  return (
    <>
      <div className={styles.panelHead}>
        <h2 id="account-notifications-heading" className={styles.panelHeading}>
          {t('notifications.title')}
        </h2>
        <AccountSavedChip visible={saved} />
      </div>

      <NotificationsSection onSaved={flashSaved} />
    </>
  );
}
