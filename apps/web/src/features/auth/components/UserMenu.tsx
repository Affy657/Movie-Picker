import { useCallback, useState } from 'react';
import {
  ChevronDown,
  Download,
  HeartHandshake,
  Lightbulb,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { MenuItem, MenuPanel, MenuSeparator } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ProposeIdeaDialog } from '@/app/components/ProposeIdeaButton';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { usePwaInstallClick } from '@/shared/hooks/usePwaInstall';
import InstallPwaDialog from '@/app/components/InstallPwaDialog';
import type { UserProfile } from '@/features/auth/types';
import styles from './UserMenu.module.css';

type UserMenuProps = {
  user: UserProfile;
};

export default function UserMenu({ user }: Readonly<UserMenuProps>) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const menu = useMenuState();
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false);

  const {
    shouldShow: showInstall,
    mode: installMode,
    guideOpen: installGuideOpen,
    guideMode: installGuideMode,
    onClick: onInstallClick,
    closeGuide: closeInstallGuide,
  } = usePwaInstallClick('user_menu');

  const logoutAction = useCallback(() => logout(), [logout]);
  const {
    run: runLogout,
    loading: loggingOut,
    error: logoutError,
  } = useAsyncAction(logoutAction, t('auth.logout.fallbackError'));

  const icon = (Icon: typeof Settings) => (
    <Icon className={styles.icon} size={ICON_SIZE.lg} aria-hidden="true" focusable="false" />
  );

  return (
    <div ref={menu.containerRef} className={styles.container}>
      <button
        {...menu.triggerProps}
        type="button"
        className={styles.trigger}
        aria-label={t('nav.accountMenu')}
      >
        <Avatar avatarId={user.avatarId} pseudo={user.displayName} size="sm" />
        <ChevronDown
          className={styles.chevron}
          data-open={menu.open || undefined}
          aria-hidden="true"
          focusable="false"
        />
      </button>

      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={t('nav.accountMenu')} className={styles.panel}>
          <p className={styles.heading}>{user.displayName}</p>
          <MenuSeparator />
          {user.handle ? (
            <MenuItem to={ROUTES.profile(user.handle)} icon={icon(UserRound)} onClick={menu.close}>
              {t('profile.settings.viewMyProfile')}
            </MenuItem>
          ) : null}
          <MenuItem to={ROUTES.account} icon={icon(Settings)} onClick={menu.close}>
            {t('nav.account')}
          </MenuItem>
          <MenuItem to={ROUTES.donate} icon={icon(HeartHandshake)} onClick={menu.close}>
            {t('footer.donate')}
          </MenuItem>
          <MenuItem
            icon={icon(Lightbulb)}
            onClick={() => {
              menu.close();
              setIdeaDialogOpen(true);
            }}
          >
            {t('proposeIdea.trigger')}
          </MenuItem>
          {showInstall ? (
            <MenuItem
              icon={icon(Download)}
              aria-haspopup={installMode === 'native' ? undefined : 'dialog'}
              onClick={() => {
                menu.close();
                void onInstallClick();
              }}
            >
              {t('pwaInstall.trigger')}
            </MenuItem>
          ) : null}
          <MenuItem icon={icon(LogOut)} onClick={() => void runLogout()} disabled={loggingOut}>
            {loggingOut ? t('auth.logout.submitting') : t('auth.account.logoutButton')}
          </MenuItem>
          {logoutError ? (
            <p className={styles.error} role="alert">
              {logoutError}
            </p>
          ) : null}
        </MenuPanel>
      ) : null}
      {ideaDialogOpen ? <ProposeIdeaDialog open onClose={() => setIdeaDialogOpen(false)} /> : null}
      {installGuideOpen ? (
        <InstallPwaDialog open mode={installGuideMode} onClose={closeInstallGuide} />
      ) : null}
    </div>
  );
}
