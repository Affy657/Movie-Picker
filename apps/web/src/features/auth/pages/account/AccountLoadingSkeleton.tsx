import { useTranslation } from '@/shared/i18n';
import styles from './AccountLoadingSkeleton.module.css';

export default function AccountLoadingSkeleton() {
  const { t } = useTranslation();

  return (
    <div className={styles.skeleton} aria-busy="true">
      <span className="visually-hidden">{t('auth.account.loadingPlaceholder')}</span>
      <div className={styles.nav} aria-hidden="true">
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
      </div>
      <div className={styles.body} aria-hidden="true">
        <div className={`${styles.bar} ${styles.w45}`} />
        <div className={`${styles.bar} ${styles.tall}`} />
        <div className={`${styles.bar} ${styles.tall}`} />
        <div className={`${styles.bar} ${styles.w70}`} />
      </div>
    </div>
  );
}
