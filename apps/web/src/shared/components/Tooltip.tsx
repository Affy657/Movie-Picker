import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Tooltip.module.css';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  label: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  delayMs?: number;
  disabled?: boolean;
  className?: string;
};

export default function Tooltip({
  label,
  children,
  placement = 'top',
  delayMs = 200,
  disabled = false,
  className,
}: Readonly<TooltipProps>) {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<number | undefined>(undefined);
  const dismissed = useRef(false);

  const clearShowTimer = () => {
    if (showTimer.current !== undefined) {
      clearTimeout(showTimer.current);
      showTimer.current = undefined;
    }
  };

  useEffect(() => clearShowTimer, []);

  const show = (immediate: boolean) => {
    if (disabled || dismissed.current) return;
    clearShowTimer();
    if (immediate || delayMs <= 0) {
      setVisible(true);
    } else {
      showTimer.current = globalThis.setTimeout(() => setVisible(true), delayMs);
    }
  };

  const hide = (resetDismissed: boolean) => {
    if (resetDismissed) dismissed.current = false;
    clearShowTimer();
    setVisible(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Escape' && visible) {
      dismissed.current = true;
      hide(false);
    }
  };

  return (
    <span
      className={clsx(styles.wrapper, className)}
      onPointerEnter={() => show(false)}
      onPointerLeave={() => hide(true)}
      onFocus={() => show(true)}
      onBlur={() => hide(true)}
      onKeyDown={handleKeyDown}
    >
      {children}
      {!disabled && (
        <span
          aria-hidden="true"
          data-placement={placement}
          data-state={visible ? 'visible' : 'hidden'}
          className={styles.bubble}
        >
          {label}
        </span>
      )}
    </span>
  );
}
