import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { useTranslation } from '@/shared/i18n';
import styles from './AccountLoadingSkeleton.module.css';

const NAV_ROWS = ['profile', 'preferences', 'notifications', 'integrations', 'security'];

export default function AccountLoadingSkeleton() {
  const { t } = useTranslation();

  return (
    <SkeletonScreen label={t('auth.account.loadingPlaceholder')} className={styles.skeleton}>
      <div className={styles.nav} aria-hidden="true">
        {NAV_ROWS.map((row) => (
          <Skeleton key={row} variant="text" className={styles.bar} />
        ))}
      </div>
      <div className={styles.body} aria-hidden="true">
        <Skeleton variant="text" className={styles.bar} width="45%" />
        <Skeleton variant="block" className={styles.tall} />
        <Skeleton variant="block" className={styles.tall} />
        <Skeleton variant="text" className={styles.bar} width="70%" />
      </div>
    </SkeletonScreen>
  );
}
