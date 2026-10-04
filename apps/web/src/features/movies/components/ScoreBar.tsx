import clsx from 'clsx';
import styles from './ScoreBar.module.css';

export default function ScoreBar({
  upRatio,
  downRatio,
  className,
}: Readonly<{ upRatio: number; downRatio: number; className?: string }>) {
  return (
    <span className={clsx(styles.scoreBar, className)}>
      {upRatio > 0 && <span className={styles.scoreBarUp} style={{ flexBasis: `${upRatio}%` }} />}
      {downRatio > 0 && (
        <span className={styles.scoreBarDown} style={{ flexBasis: `${downRatio}%` }} />
      )}
    </span>
  );
}
