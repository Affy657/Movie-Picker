import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import { Film, Plus } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import styles from './PosterFan.module.css';

export const POSTER_FAN_MAX = 3;

export type PosterFanLayout = 'stack' | 'spread';

const LAYOUTS = {
  stack: {
    root: styles.fan,
    poster: styles.poster,
    empty: styles.placeholder,
    slots: [styles.front, styles.middle, styles.back],
  },
  spread: {
    root: styles.spread,
    poster: styles.spreadPoster,
    empty: styles.spreadEmpty,
    slots: [styles.center, styles.left, styles.right],
  },
} satisfies Record<PosterFanLayout, unknown>;

export default function PosterFan({
  srcs,
  emptyIcon = <Plus size={ICON_SIZE.lg} />,
  layout = 'stack',
  progress = null,
  size = 'sm',
  className,
}: Readonly<{
  srcs: readonly (string | null | undefined)[];
  emptyIcon?: ReactNode;
  layout?: PosterFanLayout;
  progress?: number | null;
  size?: 'sm' | 'md';
  className?: string;
}>) {
  const classes = LAYOUTS[layout];
  const shown = srcs.slice(0, POSTER_FAN_MAX);
  const style = progress ? ({ '--fan-progress': `${progress}%` } as CSSProperties) : undefined;
  return (
    <span
      className={clsx(classes.root, size === 'md' && styles.md, className)}
      aria-hidden
      data-count={shown.length}
      style={style}
    >
      {shown.length === 0 ? (
        <span className={clsx(classes.poster, classes.slots[0], classes.empty)}>{emptyIcon}</span>
      ) : (
        shown.map((src, index) => (
          <span key={`${index}-${src}`} className={clsx(classes.poster, classes.slots[index])}>
            {src ? (
              <img src={src} alt="" className={styles.image} loading="lazy" decoding="async" />
            ) : (
              <Film size={ICON_SIZE.lg} className={styles.fallback} />
            )}
          </span>
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
