import clsx from 'clsx';
import { useState, type ComponentType, type SVGProps } from 'react';
import { Bookmark, CalendarDays, Compass, HelpCircle, Plus } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useLetterboxdAutoSync } from '@/features/letterboxd/hooks/useLetterboxdAutoSync';
import { useWhatsNew } from '@/shared/hooks/useWhatsNew';
import { shouldShowWhatsNewNavChip } from '@/shared/whatsNew';
import { withReturnTo, ROUTES } from '@/app/routes';
import { LANDING_ANCHORS } from '@/app/pages/landing/anchors';
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
import { buttonClass } from '@/shared/components/Button';

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

const LANDING_NAV_ITEMS: ReadonlyArray<{ anchor: string; labelKey: TranslationKey }> = [
  { anchor: LANDING_ANCHORS.steps, labelKey: 'nav.landing.howItWorks' },
  { anchor: LANDING_ANCHORS.wheel, labelKey: 'nav.landing.wheel' },
  { anchor: LANDING_ANCHORS.features, labelKey: 'nav.landing.features' },
  { anchor: LANDING_ANCHORS.faq, labelKey: 'nav.landing.faq' },
];

function DesktopNavItem({
  to,
  end,
  label,
  wideOnly,
}: Readonly<Omit<NavItemDef, 'Icon'> & { wideOnly?: boolean }>) {
  return (
    <NavLink
      to={to}
      end={end}
      className={(state) => clsx(navLinkClass(state), wideOnly && styles.navLinkWideOnly)}
    >
      {label}
    </NavLink>
  );
}

function LandingNavItem({ anchor, label }: Readonly<{ anchor: string; label: string }>) {
  return (
    <a href={`#${anchor}`} className={styles.navLink}>
      {label}
    </a>
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

function HeaderNavActions({
  isLoading,
  isAuthenticated,
  isOnAuthRoute,
  user,
  returnTo,
  onOpenWhatsNew,
  t,
}: Readonly<{
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnAuthRoute: boolean;
  user: ReturnType<typeof useAuth>['user'];
  returnTo: string;
  onOpenWhatsNew: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}>) {
  if (isLoading || (!isAuthenticated && isOnAuthRoute)) {
    return <div className={styles.navActions} />;
  }

  if (user) {
    return (
      <div className={styles.navActions}>
        {shouldShowWhatsNewNavChip(user.createdAt) ? (
          <WhatsNewNavChip onOpen={onOpenWhatsNew} />
        ) : null}
        <InboxBell />
        <UserMenu user={user} />
      </div>
    );
  }

  return (
    <div className={styles.navActions}>
      <Link
        to={withReturnTo(ROUTES.login, returnTo)}
        className={buttonClass({ size: 'sm', className: styles.guestLogin })}
      >
        {t('home.ctaLogin')}
      </Link>
      <Link
        to={withReturnTo(ROUTES.register, returnTo)}
        className={buttonClass({
          variant: 'primary',
          size: 'sm',
          className: styles.guestRegister,
        })}
      >
        {t('home.ctaRegister')}
      </Link>
    </div>
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
  const isLandingRoute = location.pathname === ROUTES.howItWorks && !isAuthenticated;
  const returnTo = `${location.pathname}${location.search}`;
  const isOnAuthRoute = (
    [ROUTES.login, ROUTES.register, ROUTES.forgotPassword, ROUTES.resetPassword] as string[]
  ).includes(location.pathname);

  const exploreItem: NavItemDef = {
    to: ROUTES.home,
    end: true,
    label: t('nav.explore'),
    Icon: Compass,
  };

  const items: NavItemDef[] = NAV_ITEMS.map(({ labelKey, ...rest }) => ({
    ...rest,
    label: t(labelKey),
  }));

  const mobileItems: NavItemDef[] = isAuthenticated ? [exploreItem, ...items] : items;

  const desktopItems: (NavItemDef & { wideOnly?: boolean })[] = isAuthenticated
    ? [exploreItem, ...items]
    : [
        {
          to: ROUTES.howItWorks,
          label: t('nav.landing.howItWorks'),
          Icon: HelpCircle,
          wideOnly: true,
        },
        ...items,
      ];

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
          <nav
            className={clsx(styles.navDesktop, isLandingRoute && styles.navLanding)}
            aria-label={t('nav.navLabel')}
          >
            {isLandingRoute
              ? LANDING_NAV_ITEMS.map((item) => (
                  <LandingNavItem key={item.anchor} anchor={item.anchor} label={t(item.labelKey)} />
                ))
              : desktopItems.map((item) => <DesktopNavItem key={item.to} {...item} />)}
          </nav>
          <HeaderNavActions
            isLoading={isLoading}
            isAuthenticated={isAuthenticated}
            isOnAuthRoute={isOnAuthRoute}
            user={user}
            returnTo={returnTo}
            onOpenWhatsNew={openWhatsNew}
            t={t}
          />
        </div>
      </header>
      <div className={styles.content}>
        <Outlet />
      </div>
      <Footer
        clearMobileNav={!isLandingRoute}
        onOpenWhatsNew={isAuthenticated ? openWhatsNew : undefined}
      />
      {isLandingRoute ? null : (
        <nav className={styles.navMobile} aria-label={t('nav.navLabel')}>
          {mobileItems.map((item) => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </nav>
      )}
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
          {proposeIdeaOpen ? (
            <ProposeIdeaDialog open onClose={() => setProposeIdeaOpen(false)} />
          ) : null}
        </>
      ) : null}
      <InAppBrowserBanner />
    </div>
  );
}
