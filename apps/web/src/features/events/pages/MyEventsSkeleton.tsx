import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import styles from './MyEventsSkeleton.module.css';

type Props = {
  label: string;
};

export default function MyEventsSkeleton({ label }: Readonly<Props>) {
  return (
    <SkeletonScreen label={label} className={styles.root}>
      <Skeleton variant="text" className={styles.pageTitle} />
      <div className={styles.tabs}>
        <Skeleton className={styles.tab} />
        <Skeleton className={styles.tab} />
      </div>

      {['a', 'b'].map((section) => (
        <div key={section} className={styles.section}>
          <Skeleton variant="text" className={styles.sectionTitle} />
          <div className={styles.list}>
            <Skeleton className={styles.card} />
            <Skeleton className={styles.card} />
            <Skeleton className={styles.card} />
          </div>
        </div>
      ))}
    </SkeletonScreen>
  );
}
