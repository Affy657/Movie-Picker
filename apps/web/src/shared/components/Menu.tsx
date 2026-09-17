import { forwardRef, type HTMLAttributes, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useMenuState } from '@/shared/hooks/useMenuState';
import styles from './Menu.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

const ENABLED_ITEM_SELECTOR = '[role="menuitem"]:not([disabled])';
const DESCENDER_CHARS = /[gjpqy]/;

function nextItemIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

function moveMenuFocus(panel: HTMLElement, event: KeyboardEvent<HTMLElement>): void {
  const items = Array.from(panel.querySelectorAll<HTMLElement>(ENABLED_ITEM_SELECTOR));
  if (items.length === 0) return;
  const next = nextItemIndex(
    event.key,
    items.indexOf(document.activeElement as HTMLElement),
    items.length
  );
  if (next === null) return;
  event.preventDefault();
  items[next]?.focus();
}

type MenuPanelProps = Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-label'> & {
  ariaLabel: string;
  anchored?: boolean;
  children: React.ReactNode;
};

export const MenuPanel = forwardRef<HTMLDivElement, MenuPanelProps>(function MenuPanel(
  { ariaLabel, anchored = true, className, onKeyDown, children, ...rest },
  ref
) {
  return (
    <div
      {...rest}
      ref={ref}
      role="menu"
      aria-label={ariaLabel}
      tabIndex={-1}
      className={clsx(styles.panel, anchored && styles.anchored, className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        moveMenuFocus(event.currentTarget, event);
      }}
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
        <MenuPanel {...menu.panelProps} ariaLabel={panelLabel} className={panelClassName}>
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
  ariaLabel?: string;
  title?: string;
  'aria-haspopup'?: 'dialog' | 'menu';
}

function itemLabelClassName(children: React.ReactNode): string {
  const capsOnly = typeof children === 'string' && !DESCENDER_CHARS.test(children);
  return clsx(styles.itemLabel, capsOnly && styles.itemLabelCaps);
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
  ariaLabel,
  title,
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
      <span className={itemLabelClassName(children)}>{children}</span>
      {selected ? <Check size={ICON_SIZE.sm} aria-hidden className={styles.itemCheck} /> : null}
    </>
  );

  if (to && !disabled) {
    return (
      <Link
        role="menuitem"
        className={className}
        to={to}
        onClick={onClick}
        aria-label={ariaLabel}
        title={title}
      >
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
        aria-label={ariaLabel}
        title={title}
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
      aria-label={ariaLabel}
      title={title}
    >
      {content}
    </button>
  );
}
