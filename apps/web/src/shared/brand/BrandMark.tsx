import clsx from 'clsx';
import { CLAP } from './brandArt';
import styles from './Brand.module.css';

type BrandMarkProps = {
  readonly animation?: 'loop' | 'once';
  readonly onAnimationEnd?: () => void;
  readonly className?: string;
};

export function BrandMark({ animation, onAnimationEnd, className }: BrandMarkProps) {
  const { x, y, width, height, rx } = CLAP.body;
  const bar = CLAP.bar;
  return (
    <svg
      viewBox={CLAP.viewBox}
      className={clsx(
        styles.mark,
        animation && styles.animated,
        animation === 'once' && styles.once,
        className
      )}
      aria-hidden="true"
      focusable="false"
      onAnimationEnd={onAnimationEnd}
    >
      <g transform={CLAP.transform}>
        <g className={styles.body}>
          <rect x={x} y={y} width={width} height={height} rx={rx} className={styles.clap} />
          <path d={CLAP.play} className={styles.ink} />
        </g>
        <g className={styles.bar} transform={CLAP.barRest}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={bar.rx}
            className={styles.clap}
          />
          <path d={CLAP.stripes} className={styles.ink} />
        </g>
        {animation ? <path d={CLAP.spark} className={styles.spark} /> : null}
      </g>
    </svg>
  );
}
