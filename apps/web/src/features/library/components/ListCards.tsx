import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import ProgressBar from '@/shared/components/ProgressBar';
import { useTranslation } from '@/shared/i18n';
import { renderWithBold } from '@/shared/utils/renderWithBold';
import { listProgressLabel } from '@/features/library/utils/listProgress';
import styles from './ListCards.module.css';

const SKELETON_CARDS = 6;

export const listGridClass = styles.grid;

export function ListsSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <SkeletonScreen label={label}>
      <ul className={styles.grid}>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <li key={index} className={styles.skeletonCard}>
            <Skeleton variant="poster" />
            <Skeleton variant="text" width="70%" />
          </li>
        ))}
      </ul>
    </SkeletonScreen>
  );
}

export function ListCardProgress({
  watched,
  total,
  viewer = false,
}: Readonly<{ watched: number; total: number; viewer?: boolean }>) {
  const { t, locale } = useTranslation();
  const progress = listProgressLabel(watched, total, t, locale);
  return (
    <ProgressBar
      className={styles.progress}
      value={(watched / total) * 100}
      label={
        viewer ? (
          renderWithBold(t('lists.public.viewerProgress', { progress }))
        ) : (
          <strong>{progress}</strong>
        )
      }
    />
  );
}
