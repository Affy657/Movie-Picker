import { useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import styles from './Dropdown.module.css';

export type DropdownOption<V extends string> = {
  value: V;
  label: string;
};

interface DropdownProps<V extends string> {
  id?: string;
  value: V;
  options: readonly DropdownOption<V>[];
  onChange: (value: V) => void;

  ariaLabel?: string;
  className?: string;
}

export default function Dropdown<V extends string>({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  className,
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
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) {
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
                tabIndex={-1}
                className={clsx(
                  styles.option,
                  selected && styles.optionSelected,
                  idx === activeIndex && styles.optionActive
                )}
                onClick={() => {
                  onChange(opt.value);
                  close();
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
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
