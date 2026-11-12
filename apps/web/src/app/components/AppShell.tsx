import clsx from 'clsx';
import { useState, type ComponentType, type SVGProps } from 'react';
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
import { useLegacyMovieLinkRedirect } from './useLegacyMovieLinkRedirect';
import styles from './AppShell.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import CreateEventDialogProvider from '@/features/events/components/create-event/CreateEventDialogProvider';
import {
  loadCreateEventDialog,
  useOpenCreateEvent,
} from '@/features/events/components/create-event/createEventDialogContext';
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

function HeaderBrand({ label }: Readonly<{ label: string }>) {
  const [clapping, setClapping] = useState(false);
  return (
    <Link
      to={ROUTES.home}
      className={styles.brand}
      aria-label={label}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setClapping(true);
      }}
    >
      <BrandMark
        animation={clapping ? 'once' : undefined}
        onAnimationEnd={() => setClapping(false)}
        className={styles.brandLogo}
      />
      <BrandWordmark className={styles.brandName} />
    </Link>
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

function preloadCreateEventDialog() {
  void loadCreateEventDialog();
}

const CREATE_EVENT_DIALOG_CHUNKS = [loadCreateEventDialog];

function CreateEventDialogIdlePrefetch() {
  useIdlePrefetch(CREATE_EVENT_DIALOG_CHUNKS);
  return null;
}

function CreateEventHeaderButton({ label }: Readonly<{ label: string }>) {
  const openCreateEvent = useOpenCreateEvent();
  return (
    <Button
      variant="primary"
      size="sm"
      className={styles.createButton}
      onClick={() => openCreateEvent()}
      onPointerEnter={preloadCreateEventDialog}
      onFocus={preloadCreateEventDialog}
    >
      <Plus size={ICON_SIZE.sm} aria-hidden />
      {label}
    </Button>
  );
}

function MobileCreateItem({
  signedIn,
  label,
  returnTo,
}: Readonly<{ signedIn: boolean; label: string; returnTo: string }>) {
  const openCreateEvent = useOpenCreateEvent();
  const content = (
    <>
      <Plus className={styles.navIcon} aria-hidden="true" focusable="false" />
      <span className={styles.navMobileLabel}>{label}</span>
    </>
  );
  if (!signedIn) {
    return (
      <Link
        to={withReturnTo(ROUTES.login, returnTo)}
        className={clsx(styles.navLink, styles.navCreate)}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={clsx(styles.navLink, styles.navCreate)}
      onClick={() => openCreateEvent()}
      onPointerEnter={preloadCreateEventDialog}
    >
      {content}
    </button>
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
        <CreateEventHeaderButton label={t('nav.createEvent')} />
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
  useLegacyMovieLinkRedirect();

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

  const mobileItemsBeforeCreate = [exploreItem, ...compactItems.slice(0, 1)];
  const mobileItemsAfterCreate = [...compactItems.slice(1), accountItem];

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
    <CreateEventDialogProvider>
      <div className={styles.root}>
        <a href="#main-content" className={styles.skipLink}>
          {t('nav.skipToMain')}
        </a>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <HeaderBrand label={t('nav.brandLabel')} />
            <nav
              className={clsx(styles.navDesktop, isLandingRoute && styles.navLanding)}
              aria-label={t('nav.navLabel')}
            >
              {isLandingRoute
                ? LANDING_NAV_ITEMS.map((item) => (
                    <LandingNavItem
                      key={item.anchor}
                      anchor={item.anchor}
                      label={t(item.labelKey)}
                    />
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
            {mobileItemsBeforeCreate.map((item) => (
              <MobileNavItem key={item.to} {...item} />
            ))}
            <MobileCreateItem
              signedIn={isAuthenticated}
              label={t('nav.createEventShort')}
              returnTo={ROUTES.createEvent}
            />
            {mobileItemsAfterCreate.map((item) => (
              <MobileNavItem key={item.to} {...item} />
            ))}
          </nav>
        )}
        <PwaAutoUpdate />
        <ConsentBanner />
        <InAppBrowserBanner />
        <MovedOriginBanner />
        <SignOutPendingNotice />
        {user ? <CreateEventDialogIdlePrefetch /> : null}
      </div>
    </CreateEventDialogProvider>
  );
}
