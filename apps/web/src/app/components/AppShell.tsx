import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';
import { CalendarDays, Home, Settings } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import styles from './AppShell.module.css';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return clsx(styles.navLink, isActive && styles.navLinkActive);
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type NavItemDef = {
  to: string;
  end?: boolean;
  label: string;
  Icon: IconComponent;
};

const NAV_ITEM_DEFS: ReadonlyArray<Omit<NavItemDef, 'label'> & { labelKey: 'nav.home' | 'nav.myEvents' | 'nav.account' }> = [
  { to: ROUTES.home, end: true, labelKey: 'nav.home', Icon: Home },
  { to: ROUTES.myEvents, labelKey: 'nav.myEvents', Icon: CalendarDays },
  { to: ROUTES.account, labelKey: 'nav.account', Icon: Settings },
];

function DesktopNavItem({ to, end, label }: NavItemDef) {
  return (
    <NavLink to={to} end={end} className={navLinkClass}>
      {label}
    </NavLink>
  );
}

function MobileNavItem({ to, end, label, Icon }: NavItemDef) {
  return (
    <NavLink to={to} end={end} className={navLinkClass}>
      <Icon className={styles.navIcon} aria-hidden="true" focusable="false" />
      <span className="visually-hidden">{label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const { t } = useTranslation();

  const items: NavItemDef[] = NAV_ITEM_DEFS.map(({ labelKey, ...rest }) => ({
    ...rest,
    label: t(labelKey),
  }));

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
          {items.map((item) => (
            <DesktopNavItem key={item.to} {...item} />
          ))}
        </nav>
      </header>
      <Outlet />
      <nav className={styles.navMobile} aria-label={t('nav.navLabel')}>
        {items.map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}
