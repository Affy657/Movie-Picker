import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import clsx from 'clsx';
import { Star } from 'lucide-react';
import { RATING_MAX } from '@/shared/utils/formatRating';
import styles from './StarRating.module.css';

type StarFill = 'full' | 'half' | 'empty';

type StarRatingProps = {
  value: number | null;
  onChange: (value: number) => void;
  size?: 'md' | 'lg';
  ariaLabel: string;
  starLabel: (stars: number) => string;
  className?: string;
};

const STARS = [1, 2, 3, 4, 5] as const;
const HALF_STEP = 1;
const KEY_STEPS: Record<string, number> = {
  ArrowRight: HALF_STEP,
  ArrowUp: HALF_STEP,
  ArrowLeft: -HALF_STEP,
  ArrowDown: -HALF_STEP,
};

function fillOf(tenths: number, star: number): StarFill {
  if (tenths >= star * 2) return 'full';
  if (tenths === star * 2 - 1) return 'half';
  return 'empty';
}

function hasFinePointer(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
}

function tenthsUnderPointer(event: MouseEvent<HTMLButtonElement>, star: number): number {
  const rect = event.currentTarget.getBoundingClientRect();
  const onLeftHalf = event.clientX - rect.left < rect.width / 2;
  return onLeftHalf ? star * 2 - 1 : star * 2;
}

export default function StarRating({
  value,
  onChange,
  size = 'md',
  ariaLabel,
  starLabel,
  className,
}: Readonly<StarRatingProps>) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value ?? 0;

  const pick = (event: MouseEvent<HTMLButtonElement>, star: number) => {
    if (preview !== null && event.detail > 0) {
      onChange(tenthsUnderPointer(event, star));
      return;
    }
    const full = star * 2;
    onChange(value === full ? full - 1 : full);
  };

  const step = (event: KeyboardEvent<HTMLButtonElement>) => {
    const delta = KEY_STEPS[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = Math.min(RATING_MAX, Math.max(1, (value ?? 0) + delta));
    if (next !== value) onChange(next);
  };

  return (
    <div
      className={clsx(styles.root, size === 'lg' && styles.lg, className)}
      role="group"
      aria-label={ariaLabel}
      onMouseLeave={() => setPreview(null)}
    >
      {STARS.map((star) => {
        const fill = fillOf(shown, star);
        return (
          <button
            key={star}
            type="button"
            className={styles.star}
            data-fill={fill}
            aria-label={starLabel(star)}
            aria-pressed={value !== null && value >= star * 2 - 1}
            onClick={(event) => pick(event, star)}
            onKeyDown={step}
            onMouseMove={(event) => {
              if (hasFinePointer()) setPreview(tenthsUnderPointer(event, star));
            }}
          >
            <span className={styles.glyph} aria-hidden="true">
              <Star className={styles.outline} />
              <Star
                className={clsx(
                  styles.fill,
                  fill === 'half' && styles.half,
                  fill === 'empty' && styles.hidden
                )}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
