import clsx from 'clsx';
import { CLAP } from './brandArt';
import styles from './Brand.module.css';

type BrandMarkProps = {
  readonly animated?: boolean;
  readonly className?: string;
};

export function BrandMark({ animated = false, className }: BrandMarkProps) {
  const { x, y, width, height, rx } = CLAP.body;
  const bar = CLAP.bar;
  return (
    <svg
      viewBox={CLAP.viewBox}
      className={clsx(styles.mark, animated && styles.animated, className)}
      aria-hidden="true"
      focusable="false"
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
        {animated ? <path d={CLAP.spark} className={styles.spark} /> : null}
      </g>
    </svg>
  );
}
