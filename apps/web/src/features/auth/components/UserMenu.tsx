import { useCallback, useId, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router';
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
import { ProposeIdeaDialog } from '@/app/components/ProposeIdeaButton';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { usePwaInstallClick, type PwaInstallMode } from '@/shared/hooks/usePwaInstall';
import InstallPwaDialog from '@/app/components/InstallPwaDialog';
import type { UserProfile } from '@/features/auth/types';
import styles from './UserMenu.module.css';

type UserMenuProps = {
  user: UserProfile;
};

export default function UserMenu({ user }: Readonly<UserMenuProps>) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);
  useMenuFocus(open, panelRef, triggerRef);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef);

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

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('nav.accountMenu')}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <Avatar avatarId={user.avatarId} pseudo={user.displayName} size="sm" />
        <ChevronDown
          className={styles.chevron}
          data-open={open || undefined}
          aria-hidden="true"
          focusable="false"
        />
      </button>

      {open ? (
        <UserMenuDropdown
          menuId={menuId}
          panelRef={panelRef}
          user={user}
          fitLeft={fitLeft}
          close={close}
          t={t}
          showInstall={showInstall}
          installMode={installMode}
          onInstallClick={onInstallClick}
          setIdeaDialogOpen={setIdeaDialogOpen}
          runLogout={runLogout}
          loggingOut={loggingOut}
          logoutError={logoutError}
        />
      ) : null}
      {ideaDialogOpen ? <ProposeIdeaDialog open onClose={() => setIdeaDialogOpen(false)} /> : null}
      {installGuideOpen ? (
        <InstallPwaDialog open mode={installGuideMode} onClose={closeInstallGuide} />
      ) : null}
    </div>
  );
}

function UserMenuDropdown({
  menuId,
  panelRef,
  user,
  fitLeft,
  close,
  t,
  showInstall,
  installMode,
  onInstallClick,
  setIdeaDialogOpen,
  runLogout,
  loggingOut,
  logoutError,
}: Readonly<{
  menuId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  user: UserProfile;
  fitLeft: number | null;
  close: () => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  showInstall: boolean;
  installMode: PwaInstallMode | null;
  onInstallClick: () => void | Promise<void>;
  setIdeaDialogOpen: (open: boolean) => void;
  runLogout: () => void | Promise<void>;
  loggingOut: boolean;
  logoutError: string | null;
}>) {
  return (
    <div
      ref={panelRef}
      id={menuId}
      className={styles.dropdown}
      tabIndex={-1}
      aria-label={t('nav.accountMenu')}
      style={fitLeft !== null ? { left: fitLeft, right: 'auto' } : undefined}
    >
      <p className={styles.heading}>{user.displayName}</p>
      {user.handle ? (
        <Link to={ROUTES.profile(user.handle)} className={styles.item} onClick={close}>
          <UserRound className={styles.icon} aria-hidden="true" focusable="false" />
          <span className={styles.itemLabel}>{t('profile.settings.viewMyProfile')}</span>
        </Link>
      ) : null}
      <Link to={ROUTES.account} className={styles.item} onClick={close}>
        <Settings className={styles.icon} aria-hidden="true" focusable="false" />
        <span className={styles.itemLabel}>{t('nav.account')}</span>
      </Link>
      <Link to={ROUTES.donate} className={styles.item} onClick={close}>
        <HeartHandshake className={styles.icon} aria-hidden="true" focusable="false" />
        <span className={styles.itemLabel}>{t('footer.donate')}</span>
      </Link>
      <button
        type="button"
        className={styles.item}
        onClick={() => {
          close();
          setIdeaDialogOpen(true);
        }}
      >
        <Lightbulb className={styles.icon} aria-hidden="true" focusable="false" />
        <span className={styles.itemLabel}>{t('proposeIdea.trigger')}</span>
      </button>
      {showInstall ? (
        <button
          type="button"
          className={styles.item}
          aria-haspopup={installMode === 'native' ? undefined : 'dialog'}
          onClick={() => {
            close();
            void onInstallClick();
          }}
        >
          <Download className={styles.icon} aria-hidden="true" focusable="false" />
          <span className={styles.itemLabel}>{t('pwaInstall.trigger')}</span>
        </button>
      ) : null}
      <button
        type="button"
        className={styles.item}
        onClick={() => void runLogout()}
        disabled={loggingOut}
      >
        <LogOut className={styles.icon} aria-hidden="true" focusable="false" />
        <span className={styles.itemLabel}>
          {loggingOut ? t('auth.logout.submitting') : t('auth.account.logoutButton')}
        </span>
      </button>
      {logoutError ? (
        <p className={styles.error} role="alert">
          {logoutError}
        </p>
      ) : null}
    </div>
  );
}
