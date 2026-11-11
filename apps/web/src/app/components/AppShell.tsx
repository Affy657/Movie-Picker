import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';
import { Bookmark, CalendarDays, Compass, HelpCircle, LogIn, Plus, UserRound } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useTranslation, type TranslationKey, type Translate } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ownProfileDestination } from '@/features/auth/utils/ownProfileDestination';
import { useLetterboxdAutoSync } from '@/features/letterboxd/hooks/useLetterboxdAutoSync';
import { withReturnTo, ROUTES } from '@/app/routes';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { routeIntentHandlers } from '@/app/routeChunks';
import { LANDING_ANCHORS } from '@/app/pages/landing/anchors';
import UserMenu from '@/features/auth/components/UserMenu';
import InboxBell from '@/features/notifications/components/InboxBell';
import Footer from './Footer';
import HeaderSearch from './HeaderSearch';
import PwaAutoUpdate from './PwaAutoUpdate';
import ConsentBanner from './ConsentBanner';
import InAppBrowserBanner from './InAppBrowserBanner';
import MovedOriginBanner from './MovedOriginBanner';
import SignOutPendingNotice from './SignOutPendingNotice';
import styles from './AppShell.module.css';
import { buttonClass } from '@/shared/components/Button';
import { BrandMark } from '@/shared/brand/BrandMark';
import { BrandWordmark } from '@/shared/brand/BrandWordmark';

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

type NavItemSpec = Omit<NavItemDef, 'label'> & {
  labelKey: TranslationKey;
  mobileLabelKey?: TranslationKey;
};

const NAV_ITEMS: ReadonlyArray<NavItemSpec> = [
  {
    to: ROUTES.myEvents,
    labelKey: 'nav.myEvents',
    mobileLabelKey: 'nav.myEventsShort',
    Icon: CalendarDays,
  },
  {
    to: ROUTES.createEvent,
    labelKey: 'nav.createEvent',
    mobileLabelKey: 'nav.createEventShort',
    Icon: Plus,
  },
  {
    to: ROUTES.watchlist,
    labelKey: 'nav.watchlist',
    mobileLabelKey: 'nav.watchlistShort',
    Icon: Bookmark,
  },
];

const LANDING_NAV_ITEMS: ReadonlyArray<{ anchor: string; labelKey: TranslationKey }> = [
  { anchor: LANDING_ANCHORS.steps, labelKey: 'nav.landing.howItWorks' },
  { anchor: LANDING_ANCHORS.wheel, labelKey: 'nav.landing.wheel' },
  { anchor: LANDING_ANCHORS.features, labelKey: 'nav.landing.features' },
  { anchor: LANDING_ANCHORS.faq, labelKey: 'nav.landing.faq' },
];

function toNavItem(spec: NavItemSpec, label: string): NavItemDef {
  return { to: spec.to, end: spec.end, label, Icon: spec.Icon };
}

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
      {...routeIntentHandlers(to)}
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
    <NavLink to={to} end={end} className={navLinkClass} {...routeIntentHandlers(to)}>
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
  t,
}: Readonly<{
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnAuthRoute: boolean;
  user: ReturnType<typeof useAuth>['user'];
  returnTo: string;
  t: Translate;
}>) {
  if (isLoading || (!isAuthenticated && isOnAuthRoute)) {
    return <div className={styles.navActions} />;
  }

  if (user) {
    return (
      <div className={styles.navActions}>
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
        {...routeIntentHandlers(ROUTES.login)}
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
        {...routeIntentHandlers(ROUTES.register)}
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

  const isAuthenticated = !!user;
  const ownProfilePath = user ? ownProfileDestination(user).path : null;
  const isLandingRoute = location.pathname === ROUTES.howItWorks && !isAuthenticated;
  const isOnAuthRoute = (
    [ROUTES.login, ROUTES.register, ROUTES.forgotPassword, ROUTES.resetPassword] as string[]
  ).includes(location.pathname);
  const returnTo = isOnAuthRoute
    ? safeReturnTo(new URLSearchParams(location.search).get('returnTo'))
    : `${location.pathname}${location.search}`;

  const exploreItem: NavItemDef = {
    to: ROUTES.home,
    end: true,
    label: t('nav.explore'),
    Icon: Compass,
  };

  const items: NavItemDef[] = NAV_ITEMS.map((spec) => toNavItem(spec, t(spec.labelKey)));

  const compactItems: NavItemDef[] = NAV_ITEMS.map((spec) =>
    toNavItem(spec, t(spec.mobileLabelKey ?? spec.labelKey))
  );

  const accountItem: NavItemDef = ownProfilePath
    ? {
        to: ownProfilePath,
        label: t('nav.profile'),
        Icon: UserRound,
      }
    : { to: withReturnTo(ROUTES.login, returnTo), label: t('nav.signInShort'), Icon: LogIn };

  const mobileItems: NavItemDef[] = [exploreItem, ...compactItems, accountItem];

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
            <BrandMark className={styles.brandLogo} />
            <BrandWordmark className={styles.brandName} />
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
          <HeaderSearch />
          <HeaderNavActions
            isLoading={isLoading}
            isAuthenticated={isAuthenticated}
            isOnAuthRoute={isOnAuthRoute}
            user={user}
            returnTo={returnTo}
            t={t}
          />
        </div>
      </header>
      <div className={styles.content}>
        <Outlet />
      </div>
      <Footer clearMobileNav={!isLandingRoute} />
      {isLandingRoute ? null : (
        <nav className={styles.navMobile} aria-label={t('nav.navLabel')}>
          {mobileItems.map((item) => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </nav>
      )}
      <PwaAutoUpdate />
      <ConsentBanner />
      <InAppBrowserBanner />
      <MovedOriginBanner />
      <SignOutPendingNotice />
    </div>
  );
}
