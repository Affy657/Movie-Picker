import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, HeartHandshake, LogOut, Settings, UserRound } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import type { UserProfile } from '@/features/auth/types';
import styles from './UserMenu.module.css';

type UserMenuProps = {
  user: UserProfile;
};

export default function UserMenu({ user }: Readonly<UserMenuProps>) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);
  useMenuFocus(open, panelRef, triggerRef);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef);

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
      ) : null}
    </div>
  );
}
