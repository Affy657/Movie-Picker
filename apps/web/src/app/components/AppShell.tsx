import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';
import { Bookmark, CalendarDays, Plus } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useLetterboxdAutoSync } from '@/features/letterboxd/hooks/useLetterboxdAutoSync';
import { useWhatsNew } from '@/shared/hooks/useWhatsNew';
import { ROUTES } from '@/app/routes';
import UserMenu from '@/features/auth/components/UserMenu';
import InboxBell from '@/features/notifications/components/InboxBell';
import Footer from './Footer';
import PwaAutoUpdate from './PwaAutoUpdate';
import ConsentBanner from './ConsentBanner';
import WhatsNewModal from './WhatsNewModal';
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
  { to: ROUTES.createEvent, labelKey: 'nav.createEvent', Icon: Plus },
  { to: ROUTES.watchlist, labelKey: 'nav.watchlist', Icon: Bookmark },
];

function DesktopNavItem({ to, end, label }: Readonly<Omit<NavItemDef, 'Icon'>>) {
  return (
    <NavLink to={to} end={end} className={navLinkClass}>
      {label}
    </NavLink>
  );
}

function MobileNavItem({ to, end, label, Icon }: Readonly<NavItemDef>) {
  return (
    <NavLink to={to} end={end} className={navLinkClass}>
      <Icon className={styles.navIcon} aria-hidden="true" focusable="false" />
      <span className={styles.navMobileLabel}>{label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useLetterboxdAutoSync();
  const {
    isOpen: whatsNewOpen,
    release: whatsNewRelease,
    openOnDemand: openWhatsNew,
    close: closeWhatsNew,
  } = useWhatsNew(user?.userId);

  const isAuthenticated = !!user;

  const items: NavItemDef[] = isAuthenticated
    ? AUTHENTICATED_NAV_ITEMS.map(({ labelKey, ...rest }) => ({
        ...rest,
        label: t(labelKey),
      }))
    : [];

  return (
    <div className={styles.root}>
      <a href="#main-content" className={styles.skipLink}>
        {t('nav.skipToMain')}
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to={ROUTES.home} className={styles.brand} aria-label={t('nav.brandLabel')}>
            <img
              src="/logo.svg"
              alt=""
              width={32}
              height={32}
              className={styles.brandLogo}
              decoding="async"
            />
            <span className={styles.brandName}>Movie Picker</span>
          </Link>
          {isAuthenticated ? (
            <>
              <nav className={styles.navDesktop} aria-label={t('nav.navLabel')}>
                {items.map((item) => (
                  <DesktopNavItem key={item.to} {...item} />
                ))}
              </nav>
              <div className={styles.navActions}>
                <InboxBell />
                <UserMenu user={user} />
              </div>
            </>
          ) : null}
        </div>
      </header>
      <div className={styles.content}>
        <Outlet />
      </div>
      <Footer
        clearMobileNav={isAuthenticated}
        onOpenWhatsNew={isAuthenticated ? openWhatsNew : undefined}
      />
      {isAuthenticated ? (
        <nav className={styles.navMobile} aria-label={t('nav.navLabel')}>
          {items.map((item) => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </nav>
      ) : null}
      <PwaAutoUpdate />
      <ConsentBanner />
      {isAuthenticated ? (
        <WhatsNewModal open={whatsNewOpen} release={whatsNewRelease} onClose={closeWhatsNew} />
      ) : null}
    </div>
  );
}
