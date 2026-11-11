import clsx from 'clsx';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import styles from './PosterBackdrop.module.css';

type PosterBackdropProps = {
  posterPath: string | null | undefined;
  direction?: 'down' | 'side';
  glow?: boolean;
  className?: string;
};

export default function PosterBackdrop({
  posterPath,
  direction = 'down',
  glow = false,
  className,
}: Readonly<PosterBackdropProps>) {
  const src = posterImageSrc(posterPath);
  if (glow) {
    if (!src) return null;
    return (
      <span className={clsx(styles.glow, className)} aria-hidden>
        <img src={src} alt="" className={styles.glowImage} decoding="async" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={clsx(styles.root, className)} aria-hidden>
      {src ? <img src={src} alt="" className={styles.image} decoding="async" /> : null}
      <span className={clsx(styles.scrim, direction === 'side' && styles.side)} />
    </span>
  );
}
