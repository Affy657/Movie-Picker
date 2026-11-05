import clsx from 'clsx';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import styles from './PosterBackdrop.module.css';

type PosterBackdropProps = {
  posterPath: string | null | undefined;
  direction?: 'down' | 'side';
  className?: string;
};

export default function PosterBackdrop({
  posterPath,
  direction = 'down',
  className,
}: Readonly<PosterBackdropProps>) {
  const src = posterImageSrc(posterPath);
  return (
    <span className={clsx(styles.root, className)} aria-hidden>
      {src ? <img src={src} alt="" className={styles.image} decoding="async" /> : null}
      <span className={clsx(styles.scrim, direction === 'side' && styles.side)} />
    </span>
  );
}
