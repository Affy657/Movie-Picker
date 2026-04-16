import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import styles from './EventDetailSkeleton.module.css';

/**
 * Skeleton de la page soirée — reproduit l'ossature : titre, métadonnées,
 * actions (partage), participants, grille de films. Réduit le shift entre le
 * chargement et le rendu final (cf. Lighthouse CLS).
 */
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.movieCard}>
            <Skeleton variant="poster" />
            <Skeleton variant="text" className={styles.movieMeta} />
            <Skeleton variant="text" className={styles.movieMetaShort} />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
