import clsx from 'clsx';
import { LogOut, MoreVertical, RotateCcw, Trash2 } from 'lucide-react';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { MenuPanel, MenuItem } from '@/shared/components/Menu';
import { useTranslation } from '@/shared/i18n';
import styles from './EventCardMenu.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import IconButton from '@/shared/components/IconButton';

interface EventCardMenuProps {
  title: string;
  className?: string;
  onDelete?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  onReuse?: () => void;
}

export default function EventCardMenu({
  title,
  className,
  onDelete,
  onRemove,
  removeLabel,
  onReuse,
}: Readonly<EventCardMenuProps>) {
  const { t } = useTranslation();
  const menu = useMenuState();

  if (!onDelete && !onRemove && !onReuse) return null;

  const label = t('events.myEvents.eventOptionsLabel', { title });

  return (
    <div ref={menu.containerRef} className={clsx(styles.container, className)}>
      <IconButton
        {...menu.triggerProps}
        ariaLabel={label}
        showTitle={false}
        size="lg"
        shape="round"
        className={styles.trigger}
      >
        <MoreVertical aria-hidden size={ICON_SIZE.md} />
      </IconButton>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={label}>
          {onReuse && (
            <MenuItem
              icon={<RotateCcw size={ICON_SIZE.sm} aria-hidden />}
              onClick={() => {
                menu.close();
                onReuse();
              }}
            >
              {t('events.settings.templates.reuseEventAction')}
            </MenuItem>
          )}
          {onDelete && (
            <MenuItem
              tone="danger"
              icon={<Trash2 size={ICON_SIZE.sm} aria-hidden />}
              onClick={() => {
                menu.close();
                onDelete();
              }}
            >
              {t('events.danger.deleteButton')}
            </MenuItem>
          )}
          {onRemove && (
            <MenuItem
              tone="danger"
              icon={<LogOut size={ICON_SIZE.sm} aria-hidden />}
              onClick={() => {
                menu.close();
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
