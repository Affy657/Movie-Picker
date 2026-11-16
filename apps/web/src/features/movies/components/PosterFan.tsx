import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './PosterFan.module.css';

const SLOTS = [styles.front, styles.middle, styles.back];

export default function PosterFan({
  srcs,
  emptyIcon,
  progress = null,
  size = 'sm',
}: Readonly<{
  srcs: readonly string[];
  emptyIcon: ReactNode;
  progress?: number | null;
  size?: 'sm' | 'md';
}>) {
  const style = progress ? ({ '--fan-progress': `${progress}%` } as CSSProperties) : undefined;
  return (
    <span className={clsx(styles.fan, size === 'md' && styles.md)} aria-hidden style={style}>
      {srcs.length === 0 ? (
        <span className={clsx(styles.poster, styles.front, styles.placeholder)}>{emptyIcon}</span>
      ) : (
        srcs.map((src, index) => (
          <img
            key={`${index}-${src}`}
            src={src}
            alt=""
            className={clsx(styles.poster, SLOTS[index])}
            loading="lazy"
            decoding="async"
          />
        ))
      )}
      {progress ? (
        <span className={styles.progress}>
          <span className={styles.progressFill} />
        </span>
      ) : null}
    </span>
  );
}
