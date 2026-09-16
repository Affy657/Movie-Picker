import { forwardRef } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useMenuState } from '@/shared/hooks/useMenuState';
import styles from './Menu.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

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
  const menu = useMenuState();

  return (
    <div ref={menu.containerRef} className={styles.container}>
      <button
        {...menu.triggerProps}
        type="button"
        className={clsx(styles.trigger, triggerClassName)}
      >
        {triggerIcon}
        <span className={styles.triggerLabel}>{triggerLabel}</span>
      </button>

      {menu.open ? (
        <MenuPanel {...menu.panelProps} label={panelLabel} className={panelClassName}>
          {children(menu.close)}
        </MenuPanel>
      ) : null}
    </div>
  );
}

export type MenuItemTone = 'default' | 'danger';

interface MenuItemProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  to?: string;
  external?: boolean;
  selected?: boolean;
  tone?: MenuItemTone;
  disabled?: boolean;
  'aria-haspopup'?: 'dialog' | 'menu';
}

export function MenuItem({
  icon,
  children,
  onClick,
  href,
  to,
  external = false,
  selected,
  tone = 'default',
  disabled = false,
  'aria-haspopup': ariaHasPopup,
}: Readonly<MenuItemProps>) {
  const className = clsx(
    styles.item,
    selected && styles.itemSelected,
    tone === 'danger' && styles.itemDanger
  );
  const content = (
    <>
      {icon}
      <span className={styles.itemLabel}>{children}</span>
      {selected ? <Check size={ICON_SIZE.sm} aria-hidden className={styles.itemCheck} /> : null}
    </>
  );

  if (to && !disabled) {
    return (
      <Link role="menuitem" className={className} to={to} onClick={onClick}>
        {content}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a
        role="menuitem"
        className={className}
        href={href}
        onClick={onClick}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-haspopup={ariaHasPopup}
    >
      {content}
    </button>
  );
}
