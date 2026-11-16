import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import clsx from 'clsx';
import { Star } from 'lucide-react';
import { RATING_MAX } from '@/shared/utils/formatRating';
import styles from './StarRating.module.css';

type StarFill = 'full' | 'half' | 'empty';

type StarRatingSize = 'md' | 'lg' | 'xl';

type EditableStarRatingProps = {
  value: number | null;
  onChange: (value: number) => void;
  size?: StarRatingSize;
  ariaLabel: string;
  starLabel: (stars: number) => string;
  className?: string;
};

type ReadOnlyStarRatingProps = {
  readOnly: true;
  value: number | null;
  size?: StarRatingSize;
  ariaLabel: string;
  className?: string;
};

type StarRatingProps = (EditableStarRatingProps & { readOnly?: false }) | ReadOnlyStarRatingProps;

const SIZE_CLASS: Record<StarRatingSize, string | undefined> = {
  md: undefined,
  lg: styles.lg,
  xl: styles.xl,
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

const PRESSED: Record<StarFill, boolean | 'mixed'> = { full: true, half: 'mixed', empty: false };

function hasFinePointer(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
}

function tenthsUnderPointer(event: MouseEvent<HTMLButtonElement>, star: number): number {
  const rect = event.currentTarget.getBoundingClientRect();
  const onLeftHalf = event.clientX - rect.left < rect.width / 2;
  return onLeftHalf ? star * 2 - 1 : star * 2;
}

function StarGlyph({ fill }: Readonly<{ fill: StarFill }>) {
  return (
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
  );
}

function ReadOnlyStarRating({
  value,
  size = 'md',
  ariaLabel,
  className,
}: Readonly<ReadOnlyStarRatingProps>) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={clsx(styles.root, SIZE_CLASS[size], className)}
    >
      {STARS.map((star) => (
        <span key={star} className={styles.cell} data-fill={fillOf(value ?? 0, star)}>
          <StarGlyph fill={fillOf(value ?? 0, star)} />
        </span>
      ))}
    </span>
  );
}

function EditableStarRating({
  value,
  onChange,
  size = 'md',
  ariaLabel,
  starLabel,
  className,
}: Readonly<EditableStarRatingProps>) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value ?? 0;

  const pick = (event: MouseEvent<HTMLButtonElement>, star: number) => {
    if (event.detail > 0) {
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
    <fieldset
      className={clsx(styles.root, SIZE_CLASS[size], className)}
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
            aria-pressed={PRESSED[fillOf(value ?? 0, star)]}
            onClick={(event) => pick(event, star)}
            onKeyDown={step}
            onMouseMove={(event) => {
              if (hasFinePointer()) setPreview(tenthsUnderPointer(event, star));
            }}
          >
            <StarGlyph fill={fill} />
          </button>
        );
      })}
    </fieldset>
  );
}

export default function StarRating(props: Readonly<StarRatingProps>) {
  if (props.readOnly) return <ReadOnlyStarRating {...props} />;
  return <EditableStarRating {...props} />;
}
