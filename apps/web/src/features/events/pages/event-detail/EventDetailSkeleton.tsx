import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import styles from './EventDetailSkeleton.module.css';

export default function EventDetailSkeleton() {
  return (
    <SkeletonScreen label="Chargement de la soirée…" className={styles.root}>
      <div className={styles.header}>
        <Skeleton variant="text" className={styles.title} />
        <Skeleton variant="text" className={styles.meta} />
        <div className={styles.actions}>
          <Skeleton className={styles.actionPill} />
          <Skeleton className={styles.actionPill} />
        </div>
      </div>

      <Skeleton variant="text" className={styles.sectionTitle} />
      <div className={styles.participants}>
        <Skeleton className={styles.chip} />
        <Skeleton className={styles.chip} />
        <Skeleton className={styles.chip} />
      </div>

      <Skeleton variant="text" className={styles.sectionTitle} />
      <div className={styles.movies}>
        {['a', 'b', 'c', 'd'].map((key) => (
          <div key={key} className={styles.movieCard}>
            <Skeleton variant="poster" />
            <Skeleton variant="text" className={styles.movieMeta} />
            <Skeleton variant="text" className={styles.movieMetaShort} />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
