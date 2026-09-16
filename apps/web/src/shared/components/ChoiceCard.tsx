import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { ICON_SIZE } from './iconSize';
import styles from './ChoiceCard.module.css';

interface ChoiceGroupContextValue {
  value: string | null;
  select: (value: string) => void;
}

const ChoiceGroupContext = createContext<ChoiceGroupContextValue | null>(null);

const RADIO_SELECTOR = '[role="radio"]';

function radiosOf(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>(RADIO_SELECTOR));
}

function nextIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowUp':
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

interface ChoiceGroupProps<T extends string> {
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  children: ReactNode;
}

export function ChoiceGroup<T extends string>({
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  className,
  children,
}: Readonly<ChoiceGroupProps<T>>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const radios = radiosOf(container);
    const checked = radios.findIndex((radio) => radio.getAttribute('aria-checked') === 'true');
    const stop = checked === -1 ? 0 : checked;
    radios.forEach((radio, index) => {
      radio.tabIndex = index === stop ? 0 : -1;
    });
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const target = event.target as HTMLElement;
    if (!container || !target.matches(RADIO_SELECTOR)) return;
    const radios = radiosOf(container);
    const next = nextIndex(event.key, radios.indexOf(target as HTMLButtonElement), radios.length);
    if (next === null) return;
    event.preventDefault();
    const radio = radios[next];
    const nextValue = radio?.dataset.value;
    if (!radio || nextValue === undefined) return;
    onChange(nextValue as T);
    radio.focus();
  };

  return (
    <ChoiceGroupContext.Provider value={{ value, select: (next) => onChange(next as T) }}>
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={clsx(styles.group, className)}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </ChoiceGroupContext.Provider>
  );
}

type ChoiceCardProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'onChange' | 'onClick' | 'role' | 'type' | 'title'
> & {
  value: string;
  label?: string;
  title?: ReactNode;
  description?: ReactNode;
  indicator?: boolean;
  layout?: 'row' | 'tile';
  dashed?: boolean;
  children?: ReactNode;
};

export function ChoiceCard({
  value,
  label,
  title,
  description,
  indicator = false,
  layout = 'row',
  dashed = false,
  className,
  children,
  ...rest
}: Readonly<ChoiceCardProps>) {
  const group = useContext(ChoiceGroupContext);
  if (!group) throw new Error('ChoiceCard must be rendered inside a ChoiceGroup');
  const selected = group.value === value;

  return (
    <button
      {...rest}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      data-value={value}
      className={clsx(
        styles.card,
        layout === 'tile' && styles.tile,
        dashed && styles.dashed,
        selected && styles.selected,
        className
      )}
      onClick={() => group.select(value)}
    >
      {indicator ? (
        <span className={styles.indicator} aria-hidden="true">
          {selected ? <Check size={ICON_SIZE.xs} aria-hidden /> : null}
        </span>
      ) : null}
      {children}
      {title || description ? (
        <span className={styles.body}>
          {title ? <span className={styles.title}>{title}</span> : null}
          {description ? <span className={styles.description}>{description}</span> : null}
        </span>
      ) : null}
    </button>
  );
}
