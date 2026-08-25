import { forwardRef, useCallback, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import styles from './Menu.module.css';

interface MenuPanelProps {
  id?: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const MenuPanel = forwardRef<HTMLDivElement, MenuPanelProps>(function MenuPanel(
  { id, label, className, style, children },
  ref
) {
  return (
    <div
      ref={ref}
      id={id}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      className={clsx(styles.panel, className)}
      style={style}
    >
      {children}
    </div>
  );
});

export function MenuLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={styles.label}>{children}</div>;
}

export function MenuSeparator() {
  return <hr className={styles.separator} />;
}

interface MenuProps {
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  triggerClassName?: string;
  panelLabel: string;
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
}

export default function Menu({
  triggerLabel,
  triggerIcon,
  triggerClassName,
  panelLabel,
  panelClassName,
  children,
}: Readonly<MenuProps>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);
  useMenuFocus(open, panelRef, triggerRef);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef);

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        ref={triggerRef}
        type="button"
        className={clsx(styles.trigger, triggerClassName)}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {triggerIcon}
        <span className={styles.triggerLabel}>{triggerLabel}</span>
      </button>

      {open ? (
        <MenuPanel
          ref={panelRef}
          id={menuId}
          label={panelLabel}
          className={panelClassName}
          style={fitLeft !== null ? { left: fitLeft, right: 'auto' } : undefined}
        >
          {children(close)}
        </MenuPanel>
      ) : null}
    </div>
  );
}

interface MenuItemProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  selected?: boolean;
  danger?: boolean;
}

export function MenuItem({
  icon,
  children,
  onClick,
  href,
  selected,
  danger,
}: Readonly<MenuItemProps>) {
  const className = clsx(styles.item, selected && styles.itemSelected, danger && styles.itemDanger);

  if (href) {
    return (
      <a role="menuitem" className={className} href={href} onClick={onClick}>
        {icon}
        <span className={styles.itemLabel}>{children}</span>
        {selected ? <Check size={14} aria-hidden className={styles.itemCheck} /> : null}
      </a>
    );
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={onClick}>
      {icon}
      <span className={styles.itemLabel}>{children}</span>
      {selected ? <Check size={14} aria-hidden className={styles.itemCheck} /> : null}
    </button>
  );
}
