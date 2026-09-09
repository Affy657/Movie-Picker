import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import Card from '@/shared/components/Card';
import pageStyles from '@/features/profile/pages/ProfilePage.module.css';
import styles from './ProfilePageSkeleton.module.css';

export function ProfileStatsSkeleton() {
  return (
    <div className={styles.stats}>
      <ul className={styles.heroGrid}>
        {['a', 'b', 'c', 'd'].map((key) => (
          <Card as="li" key={key} padding="none" className={styles.heroCard}>
            <Skeleton variant="circle" className={styles.heroIcon} />
            <div className={styles.heroText}>
              <Skeleton variant="text" className={styles.heroValue} />
              <Skeleton variant="text" className={styles.heroLabel} />
            </div>
          </Card>
        ))}
      </ul>
      <div className={styles.panels}>
        <Skeleton className={styles.panel} />
        <Skeleton className={styles.panel} />
      </div>
    </div>
  );
}

interface Props {
  label: string;
}

export default function ProfilePageSkeleton({ label }: Readonly<Props>) {
  return (
    <SkeletonScreen label={label} className={pageStyles.grid}>
      <div className={pageStyles.rail}>
        <Card padding="none" radius="lg" className={styles.card}>
          <Skeleton variant="circle" className={styles.avatar} />
          <Skeleton variant="text" className={styles.name} />
          <Skeleton variant="text" className={styles.handle} />
          <Skeleton variant="text" className={styles.bioLine} />
          <Skeleton variant="text" className={styles.bioLineShort} />
          <Skeleton className={styles.streakPill} />
          <div className={styles.followRow}>
            <Skeleton className={styles.followCell} />
            <Skeleton className={styles.followCell} />
          </div>
          <Skeleton className={styles.actionBtn} />
        </Card>
      </div>
      <div className={pageStyles.content}>
        <ProfileStatsSkeleton />
      </div>
    </SkeletonScreen>
  );
}
