import { WHEEL_SEGMENT_TOKENS } from '@/features/events/components/SpinningWheel';
import styles from './WheelGlyph.module.css';

const SLICES = 8;
const RADIUS = 46;
const CENTER = 50;

function slicePath(index: number): string {
  const start = (index / SLICES) * 2 * Math.PI - Math.PI / 2;
  const end = ((index + 1) / SLICES) * 2 * Math.PI - Math.PI / 2;
  const x1 = CENTER + RADIUS * Math.cos(start);
  const y1 = CENTER + RADIUS * Math.sin(start);
  const x2 = CENTER + RADIUS * Math.cos(end);
  const y2 = CENTER + RADIUS * Math.sin(end);
  return `M${CENTER} ${CENTER}L${x1.toFixed(2)} ${y1.toFixed(2)}A${RADIUS} ${RADIUS} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
}

export default function WheelGlyph({ className }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 -6 100 106" className={className} aria-hidden="true" focusable="false">
      {WHEEL_SEGMENT_TOKENS.slice(0, SLICES).map((token, index) => (
        <path key={token} d={slicePath(index)} style={{ fill: `var(${token})` }} />
      ))}
      <circle cx={CENTER} cy={CENTER} r={RADIUS} className={styles.rim} />
      <circle cx={CENTER} cy={CENTER} r={9} className={styles.hub} />
      <path d="M43 -5H57L50 8Z" className={styles.pointer} />
    </svg>
  );
}
