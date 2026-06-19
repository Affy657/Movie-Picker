import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings, UserRound } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
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

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  const logoutAction = useCallback(() => logout(), [logout]);
  const {
    run: runLogout,
    loading: loggingOut,
    error: logoutError,
  } = useAsyncAction(logoutAction, t('auth.logout.fallbackError'));

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('nav.accountMenu')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar avatarId={user.avatarId} size="sm" />
      </button>

      {open ? (
        <div className={styles.dropdown} role="menu">
          <p className={styles.heading}>{user.displayName}</p>
          {user.handle ? (
            <Link
              to={ROUTES.profile(user.handle)}
              className={styles.item}
              role="menuitem"
              onClick={close}
            >
              <UserRound className={styles.icon} aria-hidden="true" focusable="false" />
              {t('profile.settings.viewMyProfile')}
            </Link>
          ) : null}
          <Link to={ROUTES.account} className={styles.item} role="menuitem" onClick={close}>
            <Settings className={styles.icon} aria-hidden="true" focusable="false" />
            {t('nav.account')}
          </Link>
          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => void runLogout()}
            disabled={loggingOut}
          >
            <LogOut className={styles.icon} aria-hidden="true" focusable="false" />
            {loggingOut ? t('auth.logout.submitting') : t('auth.account.logoutButton')}
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
