import clsx from 'clsx';
import { Film, Plus } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { ICON_SIZE } from '@/shared/components/iconSize';
import styles from './PosterFan.module.css';

export type PosterFanItem = {
  title: string;
  posterPath?: string | null;
};

export const POSTER_FAN_MAX = 3;

const SLOT_CLASSES = [styles.center, styles.left, styles.right];

type PosterFanProps = {
  posters: readonly PosterFanItem[];
  className?: string;
};

export default function PosterFan({ posters, className }: Readonly<PosterFanProps>) {
  const shown = posters.slice(0, POSTER_FAN_MAX);
  return (
    <span className={clsx(styles.fan, className)} aria-hidden="true" data-count={shown.length}>
      {shown.length === 0 ? (
        <span className={clsx(styles.poster, styles.center, styles.empty)}>
          <Plus size={ICON_SIZE.lg} />
        </span>
      ) : (
        shown.map((poster, index) => {
          const src = posterImageSrc(poster.posterPath);
          return (
            <span
              key={`${index}-${poster.title}`}
              className={clsx(styles.poster, SLOT_CLASSES[index])}
            >
              {src ? (
                <img src={src} alt="" className={styles.image} loading="lazy" decoding="async" />
              ) : (
                <Film size={ICON_SIZE.lg} className={styles.fallback} />
              )}
            </span>
          );
        })
      )}
    </span>
  );
}
