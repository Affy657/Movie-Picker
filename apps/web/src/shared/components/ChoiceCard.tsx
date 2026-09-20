import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
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
  onRadioKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const ChoiceGroupContext = createContext<ChoiceGroupContextValue | null>(null);

const RADIO_SELECTOR = '[role="radio"]:not([disabled])';

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
  id?: string;
  value: T | null;
  onChange: (value: T) => void;
  onSelect?: (value: T) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  children: ReactNode;
}

export function ChoiceGroup<T extends string>({
  id,
  value,
  onChange,
  onSelect,
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

  const select = useCallback(
    (next: string) => {
      onChange(next as T);
      onSelect?.(next as T);
    },
    [onChange, onSelect]
  );

  const onRadioKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const radios = radiosOf(container);
      const next = nextIndex(event.key, radios.indexOf(event.currentTarget), radios.length);
      if (next === null) return;
      event.preventDefault();
      const radio = radios[next];
      const nextValue = radio?.dataset.value;
      if (!radio || nextValue === undefined) return;
      onChange(nextValue as T);
      radio.focus();
    },
    [onChange]
  );

  const contextValue = useMemo(
    () => ({ value, select, onRadioKeyDown }),
    [value, select, onRadioKeyDown]
  );

  return (
    <ChoiceGroupContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        id={id}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={clsx(styles.group, className)}
      >
        {children}
      </div>
    </ChoiceGroupContext.Provider>
  );
}

type ChoiceCardProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'onChange' | 'onClick' | 'onKeyDown' | 'role' | 'type' | 'title'
> & {
  value: string;
  ariaLabel?: string;
  title?: ReactNode;
  description?: ReactNode;
  indicator?: boolean;
  layout?: 'row' | 'tile';
  dashed?: boolean;
  children?: ReactNode;
};

export function ChoiceCard({
  value,
  ariaLabel,
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
      aria-label={ariaLabel}
      data-value={value}
      className={clsx(
        styles.card,
        layout === 'tile' && styles.tile,
        dashed && styles.dashed,
        selected && styles.selected,
        className
      )}
      onClick={() => group.select(value)}
      onKeyDown={group.onRadioKeyDown}
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
