import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';
import { CalendarDays, Settings } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ROUTES } from '@/app/routes';
import Avatar from '@/shared/components/Avatar';
import Footer from './Footer';
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

type NavItemSpec = Omit<NavItemDef, 'label'> & { labelKey: TranslationKey };

const AUTHENTICATED_NAV_ITEMS: ReadonlyArray<NavItemSpec> = [
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
  const { user } = useAuth();

  const items: NavItemDef[] = user
    ? AUTHENTICATED_NAV_ITEMS.map(({ labelKey, ...rest }) => ({
        ...rest,
        label: t(labelKey),
      }))
    : [];

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
          <span className={styles.brandName}>Movie Picker</span>
        </Link>
        {items.length > 0 ? (
          <nav className={styles.navDesktop} aria-label={t('nav.navLabel')}>
            {items.map((item) => (
              <DesktopNavItem key={item.to} {...item} />
            ))}
            {user && <Avatar avatarId={user.avatarId} size="sm" className={styles.headerAvatar} />}
          </nav>
        ) : null}
      </header>
      <Outlet />
      <Footer clearMobileNav={items.length > 0} />
      {items.length > 0 ? (
        <nav className={styles.navMobile} aria-label={t('nav.navLabel')}>
          {items.map((item) => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
