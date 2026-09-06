import clsx from 'clsx';
import { useState, type ComponentType, type SVGProps } from 'react';
import { Bookmark, CalendarDays, Plus } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useLetterboxdAutoSync } from '@/features/letterboxd/hooks/useLetterboxdAutoSync';
import { useWhatsNew } from '@/shared/hooks/useWhatsNew';
import { shouldShowWhatsNewNavChip } from '@/shared/whatsNew';
import { withReturnTo, ROUTES } from '@/app/routes';
import UserMenu from '@/features/auth/components/UserMenu';
import InboxBell from '@/features/notifications/components/InboxBell';
import Footer from './Footer';
import PwaAutoUpdate from './PwaAutoUpdate';
import ConsentBanner from './ConsentBanner';
import WhatsNewModal from './WhatsNewModal';
import WhatsNewNavChip from './WhatsNewNavChip';
import { ProposeIdeaDialog } from './ProposeIdeaButton';
import InAppBrowserBanner from './InAppBrowserBanner';
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

const NAV_ITEMS: ReadonlyArray<NavItemSpec> = [
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
  const { user, isLoading } = useAuth();
  const location = useLocation();
  useLetterboxdAutoSync();
  const {
    isOpen: whatsNewOpen,
    release: whatsNewRelease,
    openOnDemand: openWhatsNew,
    close: closeWhatsNew,
  } = useWhatsNew(user?.userId);
  const [proposeIdeaOpen, setProposeIdeaOpen] = useState(false);

  const isAuthenticated = !!user;
  const returnTo = `${location.pathname}${location.search}`;
  const isOnAuthRoute = (
    [ROUTES.login, ROUTES.register, ROUTES.forgotPassword, ROUTES.resetPassword] as string[]
  ).includes(location.pathname);

  const items: NavItemDef[] = NAV_ITEMS.map(({ labelKey, ...rest }) => ({
    ...rest,
    label: t(labelKey),
  }));

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
          <nav className={styles.navDesktop} aria-label={t('nav.navLabel')}>
            {items.map((item) => (
              <DesktopNavItem key={item.to} {...item} />
            ))}
          </nav>
          {isLoading || (!isAuthenticated && isOnAuthRoute) ? (
            <div className={styles.navActions} />
          ) : isAuthenticated ? (
            <div className={styles.navActions}>
              {shouldShowWhatsNewNavChip(user.createdAt) ? (
                <WhatsNewNavChip onOpen={openWhatsNew} />
              ) : null}
              <InboxBell />
              <UserMenu user={user} />
            </div>
          ) : (
            <div className={styles.navActions}>
              <Link
                to={withReturnTo(ROUTES.login, returnTo)}
                className={`btn btn-sm ${styles.guestLogin}`}
              >
                {t('home.ctaLogin')}
              </Link>
              <Link
                to={withReturnTo(ROUTES.register, returnTo)}
                className={`btn btn-primary btn-sm ${styles.guestRegister}`}
              >
                {t('home.ctaRegister')}
              </Link>
            </div>
          )}
        </div>
      </header>
      <div className={styles.content}>
        <Outlet />
      </div>
      <Footer clearMobileNav onOpenWhatsNew={isAuthenticated ? openWhatsNew : undefined} />
      <nav className={styles.navMobile} aria-label={t('nav.navLabel')}>
        {items.map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
      </nav>
      <PwaAutoUpdate />
      <ConsentBanner />
      {isAuthenticated ? (
        <>
          <WhatsNewModal
            open={whatsNewOpen}
            release={whatsNewRelease}
            profileHandle={user.handle}
            onClose={closeWhatsNew}
            onAction={(action) => {
              if (action === 'proposeIdea') setProposeIdeaOpen(true);
            }}
          />
          <ProposeIdeaDialog open={proposeIdeaOpen} onClose={() => setProposeIdeaOpen(false)} />
        </>
      ) : null}
      <InAppBrowserBanner />
    </div>
  );
}
