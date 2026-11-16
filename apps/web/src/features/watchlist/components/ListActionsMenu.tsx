import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import { MenuPanel } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { useTranslation } from '@/shared/i18n';
import styles from './ListActionsMenu.module.css';

type PickAction = (action: () => void) => () => void;

export default function ListActionsMenu({
  children,
}: Readonly<{ children: (pick: PickAction) => ReactNode }>) {
  const { t } = useTranslation();
  const menu = useMenuState();
  const label = t('lists.page.moreActions');
  const pick: PickAction = (action) => () => {
    menu.close();
    action();
  };
  return (
    <div ref={menu.containerRef} className={styles.menu}>
      <IconButton {...menu.triggerProps} ariaLabel={label} showTitle={false}>
        <MoreHorizontal aria-hidden size={ICON_SIZE.md} />
      </IconButton>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={label} className={styles.panel}>
          {children(pick)}
        </MenuPanel>
      ) : null}
    </div>
  );
}
