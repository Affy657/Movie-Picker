import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { useTranslation } from '@/shared/i18n';
import { readMoviesViewMode } from '@/features/events/moviesViewMode';
import styles from './EventDetailSkeleton.module.css';

const ROWS = ['a', 'b', 'c', 'd', 'e', 'f'];

function MoviesGridSketch() {
  return (
    <div className={styles.movies} data-testid="event-skeleton-grid">
      {ROWS.map((key) => (
        <div key={key} className={styles.movieCard}>
          <Skeleton className={styles.moviePoster} />
          <div className={styles.movieInfo}>
            <Skeleton variant="text" className={styles.movieMeta} />
            <Skeleton variant="text" className={styles.movieMetaShort} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MoviesListSketch() {
  return (
    <div className={styles.table} data-testid="event-skeleton-list">
      <Skeleton className={styles.tableHeader} />
      {ROWS.map((key) => (
        <div key={key} className={styles.tableRow}>
          <Skeleton className={styles.rowPoster} />
          <div className={styles.movieInfo}>
            <Skeleton variant="text" className={styles.movieMeta} />
            <Skeleton variant="text" className={styles.movieMetaShort} />
          </div>
          <Skeleton variant="text" className={styles.rowCell} />
          <Skeleton variant="text" className={styles.rowCell} />
          <Skeleton className={styles.rowAction} />
        </div>
      ))}
    </div>
  );
}

export default function EventDetailSkeleton() {
  const { t } = useTranslation();
  const grid = readMoviesViewMode() === 'grid';
  return (
    <SkeletonScreen label={t('events.detail.skeletonLabel')} className={styles.root}>
      <Skeleton variant="text" className={styles.backLink} />
      <div className={styles.header}>
        <Skeleton variant="text" className={styles.title} />
        <Skeleton className={styles.themeChip} />
        <div className={styles.actions}>
          <Skeleton className={styles.primaryAction} />
          <Skeleton className={styles.iconAction} />
          <Skeleton className={styles.iconAction} />
          <span className={styles.actionsSpacer} />
          <Skeleton className={styles.iconAction} />
          <Skeleton className={styles.iconAction} />
        </div>
        <Skeleton variant="text" className={styles.meta} />
      </div>

      {grid ? <MoviesGridSketch /> : <MoviesListSketch />}
    </SkeletonScreen>
  );
}
