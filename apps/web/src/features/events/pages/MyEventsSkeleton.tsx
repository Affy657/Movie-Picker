import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import styles from './MyEventsSkeleton.module.css';

type Props = {
  label: string;
};

/**
 * Skeleton de « Mes soirées » — titre de page et deux sections de cartes.
 * Libellé fourni par le parent pour rester localisable.
 */
export default function MyEventsSkeleton({ label }: Props) {
  return (
    <SkeletonScreen label={label} className={styles.root}>
      <Skeleton variant="text" className={styles.pageTitle} />

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
