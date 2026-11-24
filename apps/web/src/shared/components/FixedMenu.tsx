import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MenuPanel } from '@/shared/components/Menu';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { fixedPopoverStyle, useFixedPopover } from '@/shared/hooks/useFixedPopover';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import styles from './FixedMenu.module.css';

export default function FixedMenu({
  ariaLabel,
  triggerContent,
  triggerAriaLabel,
  triggerClassName,
  children,
}: Readonly<{
  ariaLabel: string;
  triggerContent: ReactNode;
  triggerAriaLabel: string;
  triggerClassName?: string;
  children: (close: () => void) => ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const dismiss = useCallback(() => setOpen(false), []);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useClickOutside([triggerRef, panelRef], dismiss, open, { closeOnFocusLeave: true });
  useMenuFocus(open, panelRef, triggerRef);
  const position = useFixedPopover(open, triggerRef, panelRef);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={triggerClassName}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerAriaLabel}
      >
        {triggerContent}
      </button>
      {open
        ? createPortal(
            <MenuPanel
              ref={panelRef}
              id={menuId}
              ariaLabel={ariaLabel}
              anchored={false}
              className={styles.panel}
              data-placement={position?.placement}
              style={fixedPopoverStyle(position)}
            >
              {children(close)}
            </MenuPanel>,
            document.body
          )
        : null}
    </>
  );
}
