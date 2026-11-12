import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import styles from './ProfilePageSkeleton.module.css';

const FIGURES = ['a', 'b', 'c', 'd', 'e', 'f'];

export function ProfileStatsSkeleton() {
  return (
    <div className={styles.figures}>
      {FIGURES.map((key) => (
        <div key={key} className={styles.figure}>
          <Skeleton variant="text" className={styles.figureValue} />
          <Skeleton variant="text" className={styles.figureLabel} />
        </div>
      ))}
    </div>
  );
}

interface Props {
  label: string;
}

export default function ProfilePageSkeleton({ label }: Readonly<Props>) {
  return (
    <SkeletonScreen label={label}>
      <div className={styles.header}>
        <Skeleton variant="circle" className={styles.avatar} />
        <div className={styles.identity}>
          <Skeleton variant="text" className={styles.name} />
          <Skeleton variant="text" className={styles.meta} />
          <Skeleton variant="text" className={styles.bio} />
          <Skeleton variant="text" className={styles.social} />
        </div>
        <Skeleton className={styles.action} />
      </div>
      <ProfileStatsSkeleton />
    </SkeletonScreen>
  );
}
