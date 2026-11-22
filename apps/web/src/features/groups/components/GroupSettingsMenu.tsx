import { Ellipsis, LogOut, Pencil, Trash2, Users } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import { MenuItem, MenuPanel, MenuSeparator } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { useTranslation } from '@/shared/i18n';
import styles from './GroupSettingsMenu.module.css';

export type GroupDialog = 'rename' | 'members' | 'delete' | 'leave';

export default function GroupSettingsMenu({
  isOwner,
  onOpen,
}: Readonly<{ isOwner: boolean; onOpen: (dialog: GroupDialog) => void }>) {
  const { t } = useTranslation();
  const menu = useMenuState();
  const label = t('groups.page.settings');
  const pick = (dialog: GroupDialog) => () => {
    menu.close();
    onOpen(dialog);
  };

  return (
    <div ref={menu.containerRef} className={styles.menu}>
      <IconButton {...menu.triggerProps} ariaLabel={label} showTitle={false}>
        <Ellipsis aria-hidden size={ICON_SIZE.md} />
      </IconButton>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={label}>
          {isOwner ? (
            <MenuItem
              icon={<Pencil aria-hidden size={ICON_SIZE.sm} />}
              aria-haspopup="dialog"
              onClick={pick('rename')}
            >
              {t('groups.page.rename')}
            </MenuItem>
          ) : null}
          <MenuItem
            icon={<Users aria-hidden size={ICON_SIZE.sm} />}
            aria-haspopup="dialog"
            onClick={pick('members')}
          >
            {t('groups.page.members')}
          </MenuItem>
          <MenuSeparator />
          {isOwner ? (
            <MenuItem
              tone="danger"
              icon={<Trash2 aria-hidden size={ICON_SIZE.sm} />}
              aria-haspopup="dialog"
              onClick={pick('delete')}
            >
              {t('groups.page.delete')}
            </MenuItem>
          ) : (
            <MenuItem
              tone="danger"
              icon={<LogOut aria-hidden size={ICON_SIZE.sm} />}
              aria-haspopup="dialog"
              onClick={pick('leave')}
            >
              {t('groups.page.leave')}
            </MenuItem>
          )}
        </MenuPanel>
      ) : null}
    </div>
  );
}
