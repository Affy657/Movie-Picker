import { useCallback, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { MenuPanel } from '@/shared/components/Menu';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { fixedPopoverStyle, useFixedPopover } from '@/shared/hooks/useFixedPopover';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import styles from './FixedMenu.module.css';

export interface FixedMenuTriggerProps {
  ref: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
}

export default function FixedMenu({
  ariaLabel,
  trigger,
  children,
}: Readonly<{
  ariaLabel: string;
  trigger: (props: FixedMenuTriggerProps) => ReactNode;
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
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((value) => !value),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
      })}
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
