import { useCallback, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { LogOut, MoreVertical, Trash2 } from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import { MenuPanel, MenuItem } from '@/shared/components/Menu';
import { useTranslation } from '@/shared/i18n';
import styles from './EventCardMenu.module.css';

interface EventCardMenuProps {
  title: string;
  className?: string;
  onDelete?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}

export default function EventCardMenu({
  title,
  className,
  onDelete,
  onRemove,
  removeLabel,
}: Readonly<EventCardMenuProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);
  useMenuFocus(open, panelRef, triggerRef);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef);

  if (!onDelete && !onRemove) return null;

  const label = t('events.myEvents.eventOptionsLabel', { title });

  return (
    <div ref={containerRef} className={clsx(styles.container, className)}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
      >
        <MoreVertical aria-hidden size={16} />
      </button>
      {open ? (
        <MenuPanel
          ref={panelRef}
          id={menuId}
          label={label}
          style={fitLeft !== null ? { left: fitLeft, right: 'auto' } : undefined}
        >
          {onDelete && (
            <MenuItem
              danger
              icon={<Trash2 size={14} aria-hidden />}
              onClick={() => {
                close();
                onDelete();
              }}
            >
              {t('events.danger.deleteButton')}
            </MenuItem>
          )}
          {onRemove && (
            <MenuItem
              danger
              icon={<LogOut size={14} aria-hidden />}
              onClick={() => {
                close();
                onRemove();
              }}
            >
              {removeLabel ?? t('events.participants.leaveAction')}
            </MenuItem>
          )}
        </MenuPanel>
      ) : null}
    </div>
  );
}
