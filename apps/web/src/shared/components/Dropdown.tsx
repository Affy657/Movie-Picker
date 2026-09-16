import { useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import styles from './Dropdown.module.css';

export type DropdownOption<V extends string> = {
  value: V;
  label: string;
  disabled?: boolean;
};

interface DropdownProps<V extends string> {
  id?: string;
  value: V;
  options: readonly DropdownOption<V>[];
  onChange: (value: V) => void;

  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

function nextEnabledIndex<V extends string>(
  options: readonly DropdownOption<V>[],
  from: number,
  step: 1 | -1
): number {
  let index = from;
  while (index >= 0 && index < options.length) {
    if (!options[index]?.disabled) return index;
    index += step;
  }
  return from - step;
}

export default function Dropdown<V extends string>({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  className,
  disabled = false,
}: Readonly<DropdownProps<V>>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reactId = useId();
  const listId = `${id ?? reactId}-list`;

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  const close = useCallback((focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setActiveIndex(idx);
    const rafId = globalThis.requestAnimationFrame(() => {
      const items = listRef.current?.querySelectorAll<HTMLLIElement>('[role="option"]');
      items?.[Math.max(0, idx)]?.focus();
    });
    return () => globalThis.cancelAnimationFrame(rafId);
  }, [open, options, value]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => nextEnabledIndex(options, Math.min(options.length - 1, i + 1), 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => nextEnabledIndex(options, Math.max(0, i - 1), -1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(nextEnabledIndex(options, 0, 1));
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(nextEnabledIndex(options, options.length - 1, -1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) {
        onChange(opt.value);
        close();
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const items = listRef.current?.querySelectorAll<HTMLLIElement>('[role="option"]');
    items?.[activeIndex]?.focus();
  }, [activeIndex, open]);

  return (
    <div ref={rootRef} className={clsx(styles.root, className)}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKey}
      >
        <span className={styles.triggerLabel}>{selectedLabel}</span>
        <span className={styles.triggerChevron} aria-hidden />
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={styles.menu}
          tabIndex={-1}
          onKeyDown={handleKey}
        >
          {options.map((opt, idx) => {
            const selected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                aria-disabled={opt.disabled || undefined}
                tabIndex={-1}
                className={clsx(
                  styles.option,
                  selected && styles.optionSelected,
                  opt.disabled && styles.optionDisabled,
                  idx === activeIndex && styles.optionActive
                )}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  close();
                }}
                onMouseEnter={() => {
                  if (!opt.disabled) setActiveIndex(idx);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (opt.disabled) return;
                    onChange(opt.value);
                    close();
                  }
                }}
              >
                <span className={styles.optionLabel}>{opt.label}</span>
                {selected ? <Check size={16} aria-hidden className={styles.optionCheck} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
