import clsx from 'clsx';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import styles from './AppShell.module.css';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return clsx(styles.navLink, isActive && styles.navLinkActive);
}

export default function AppShell() {
  const { t } = useTranslation();

  const links = (
    <>
      <NavLink to={ROUTES.home} end className={navLinkClass}>
        {t('nav.home')}
      </NavLink>
      <NavLink to={ROUTES.myEvents} className={navLinkClass}>
        {t('nav.myEvents')}
      </NavLink>
      <NavLink to={ROUTES.account} className={navLinkClass}>
        {t('nav.account')}
      </NavLink>
    </>
  );

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link to={ROUTES.home} className={styles.brand} aria-label={t('nav.brandLabel')}>
          <img
            src="/favicon.svg"
            alt=""
            width={32}
            height={32}
            className={styles.brandLogo}
            decoding="async"
          />
        </Link>
        <nav className={styles.navDesktop} aria-label={t('nav.navLabel')}>
          {links}
        </nav>
      </header>
      <Outlet />
      <nav className={styles.navMobile} aria-label={t('nav.navLabel')}>
        {links}
      </nav>
    </div>
  );
}
