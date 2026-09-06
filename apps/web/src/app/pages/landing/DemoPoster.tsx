import clsx from 'clsx';
import styles from './landingDemo.module.css';

export type PosterTone = 1 | 2 | 3 | 4 | 5 | 6;

const TONE_CLASS: Record<PosterTone, string | undefined> = {
  1: styles.poster1,
  2: styles.poster2,
  3: styles.poster3,
  4: styles.poster4,
  5: styles.poster5,
  6: styles.poster6,
};

type DemoPosterProps = {
  tone: PosterTone;
  label: string;
  large?: boolean;
  className?: string;
};

export default function DemoPoster({
  tone,
  label,
  large = false,
  className,
}: Readonly<DemoPosterProps>) {
  return (
    <span
      aria-hidden="true"
      className={clsx(styles.poster, TONE_CLASS[tone], large && styles.posterLg, className)}
    >
      <span className={styles.posterLabel}>{label}</span>
    </span>
  );
}
