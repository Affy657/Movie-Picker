import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import styles from './WatchlistSkeleton.module.css';

type WatchlistSkeletonProps = {
  label: string;
  gridClassName?: string;
};

const PLACEHOLDER_COUNT = 6;

export default function WatchlistSkeleton({
  label,
  gridClassName,
}: Readonly<WatchlistSkeletonProps>) {
  return (
    <SkeletonScreen label={label} className={gridClassName}>
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
        <div key={index} className={styles.card}>
          <Skeleton variant="poster" />
          <Skeleton variant="text" className={styles.line} />
          <Skeleton variant="text" className={styles.lineShort} />
        </div>
      ))}
    </SkeletonScreen>
  );
}
