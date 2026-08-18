import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import styles from './EventDetailSkeleton.module.css';

export default function EventDetailSkeleton() {
  return (
    <SkeletonScreen label="Chargement de la soirée…" className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Skeleton variant="text" className={styles.title} />
          <div className={styles.actions}>
            <Skeleton className={styles.actionPill} />
            <Skeleton className={styles.actionPill} />
          </div>
        </div>
        <Skeleton variant="text" className={styles.meta} />
      </div>

      <Skeleton className={styles.search} />
      <Skeleton variant="text" className={styles.sortBar} />

      <div className={styles.movies}>
        {['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
          <div key={key} className={styles.movieCard}>
            <Skeleton className={styles.moviePoster} />
            <div className={styles.movieInfo}>
              <Skeleton variant="text" className={styles.movieMeta} />
              <Skeleton variant="text" className={styles.movieMetaShort} />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
