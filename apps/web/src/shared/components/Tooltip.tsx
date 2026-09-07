import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
  focusable?: boolean;
};

export default function Tooltip({
  label,
  children,
  placement = 'top',
  delayMs = 200,
  disabled = false,
  className,
  focusable = false,
}: Readonly<TooltipProps>) {
  const bubbleId = useId();
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

  useEffect(() => {
    if (!visible) return undefined;
    const onEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissed.current = true;
        setVisible(false);
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [visible]);

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

  return (
    <span
      className={clsx(styles.wrapper, focusable && styles.wrapperFocusable, className)}
      onPointerEnter={() => show(false)}
      onPointerLeave={() => hide(true)}
      onFocus={() => show(true)}
      onBlur={() => hide(true)}
      tabIndex={focusable && !disabled ? 0 : undefined}
      aria-describedby={focusable && !disabled ? bubbleId : undefined}
    >
      {children}
      {!disabled && (
        <span
          id={focusable ? bubbleId : undefined}
          aria-hidden={focusable ? undefined : 'true'}
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
