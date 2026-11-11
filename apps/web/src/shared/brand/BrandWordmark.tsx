import clsx from 'clsx';
import { WORDMARK } from './brandArt';
import styles from './Brand.module.css';

type BrandWordmarkProps = {
  readonly className?: string;
};

export function BrandWordmark({ className }: BrandWordmarkProps) {
  const { movieDot, pickerDot } = WORDMARK;
  return (
    <svg
      viewBox={WORDMARK.viewBox}
      className={clsx(styles.wordmark, className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d={WORDMARK.movie} className={styles.word} />
      <circle cx={movieDot.cx} cy={movieDot.cy} r={movieDot.r} className={styles.word} />
      <path d={WORDMARK.picker} className={styles.picker} />
      <circle cx={pickerDot.cx} cy={pickerDot.cy} r={pickerDot.r} className={styles.dot} />
    </svg>
  );
}
