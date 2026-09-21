import { lazy, Suspense, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import { Bookmark, CalendarPlus, Inbox } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { useTranslation, LocaleProvider } from '@/shared/i18n';
import { AuthProvider } from '@/features/auth/contexts/AuthContext';
import UserThemeSync from '@/app/components/UserThemeSync';
import AnalyticsSync from '@/app/components/AnalyticsSync';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import AppShell from '@/app/components/AppShell';
import SessionGate from '@/app/components/SessionGate';
import ScrollToTop from '@/app/components/ScrollToTop';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { ROUTE_CHUNKS } from '@/app/routeChunks';
import { useHomeShowcasePrefetch } from '@/features/movies/homeShowcasePrefetch';
import { ICON_SIZE } from '@/shared/components/iconSize';

const HomePage = lazy(ROUTE_CHUNKS.home);
const ShowcaseListPage = lazy(ROUTE_CHUNKS.showcaseList);
const MovieCollectionsPage = lazy(ROUTE_CHUNKS.movieCollections);
const LandingPage = lazy(ROUTE_CHUNKS.landing);
const CreateEvent = lazy(ROUTE_CHUNKS.createEvent);
const EventDetail = lazy(ROUTE_CHUNKS.eventDetail);
const NightRecapPage = lazy(ROUTE_CHUNKS.nightRecap);
const LoginPage = lazy(ROUTE_CHUNKS.login);
const RegisterPage = lazy(ROUTE_CHUNKS.register);
const ForgotPasswordPage = lazy(ROUTE_CHUNKS.forgotPassword);
const ResetPasswordPage = lazy(ROUTE_CHUNKS.resetPassword);
const OAuthCallbackPage = lazy(ROUTE_CHUNKS.oauthCallback);
const AccountPage = lazy(ROUTE_CHUNKS.account);
const LegalNoticePage = lazy(ROUTE_CHUNKS.legalNotice);
const PrivacyPolicyPage = lazy(ROUTE_CHUNKS.privacyPolicy);
const DonatePage = lazy(ROUTE_CHUNKS.donate);
const TechPage = lazy(ROUTE_CHUNKS.tech);
const MyEventsPage = lazy(ROUTE_CHUNKS.myEvents);
const WatchlistPage = lazy(ROUTE_CHUNKS.watchlist);
const NotificationsPage = lazy(ROUTE_CHUNKS.notifications);
const ProfilePage = lazy(ROUTE_CHUNKS.profile);
const ProfileMoviesPage = lazy(ROUTE_CHUNKS.profileMovies);
const ProfileWatchlistPage = lazy(ROUTE_CHUNKS.profileWatchlist);
const NotFoundPage = lazy(ROUTE_CHUNKS.notFound);

function PageFallback() {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <p className="placeholder">{t('common.loading')}</p>
    </PageLayout>
  );
}

function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
      },
    },
  });
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.howItWorks} element={<LandingPage />} />
        <Route path={ROUTES.movieSearch} element={<ShowcaseListPage variant="search" />} />
        <Route path={ROUTES.movieCollections} element={<MovieCollectionsPage />} />
        <Route path={ROUTES.showcaseTrending} element={<ShowcaseListPage variant="trending" />} />
        <Route
          path={ROUTES.showcaseNowPlaying}
          element={<ShowcaseListPage variant="now-playing" />}
        />
        <Route
          path={ROUTES.showcaseMostProposed}
          element={<ShowcaseListPage variant="most-proposed" />}
        />
        <Route
          path={ROUTES.showcaseProviderPattern}
          element={<ShowcaseListPage variant="provider" />}
        />
        <Route
          path={ROUTES.showcaseRecommendationsPattern}
          element={<ShowcaseListPage variant="recommendations" />}
        />
        <Route path={ROUTES.showcaseThemePattern} element={<ShowcaseListPage variant="theme" />} />
        <Route
          path={ROUTES.movieCollectionPattern}
          element={<ShowcaseListPage variant="collection" />}
        />
        <Route
          path={ROUTES.createEvent}
          element={
            <SessionGate
              icon={<CalendarPlus size={ICON_SIZE['3xl']} aria-hidden />}
              headingKey="nav.createEvent"
              headingHidden
              titleKey="events.create.signedOutTitle"
              messageKey="events.create.signedOutMessage"
              returnTo={ROUTES.createEvent}
              maxWidth="var(--container-sm)"
              back={{ to: ROUTES.myEvents, labelKey: 'nav.myEvents' }}
            >
              <CreateEvent />
            </SessionGate>
          }
        />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        <Route path={ROUTES.oauthCallback} element={<OAuthCallbackPage />} />
        <Route path={ROUTES.legalNotice} element={<LegalNoticePage />} />
        <Route path={ROUTES.privacyPolicy} element={<PrivacyPolicyPage />} />
        <Route path={ROUTES.donate} element={<DonatePage />} />
        <Route path={ROUTES.tech} element={<TechPage />} />
        <Route path={`${ROUTES.account}/*`} element={<AccountPage />} />
        <Route
          path={ROUTES.myEvents}
          element={
            <SessionGate
              icon={<CalendarPlus size={ICON_SIZE['3xl']} aria-hidden />}
              headingKey="events.myEvents.title"
              titleKey="events.myEvents.signedOutTitle"
              messageKey="events.myEvents.signedOutMessage"
              returnTo={ROUTES.myEvents}
              maxWidth="min(var(--container-xl), 100%)"
            >
              <MyEventsPage />
            </SessionGate>
          }
        />
        <Route
          path={ROUTES.watchlist}
          element={
            <SessionGate
              icon={<Bookmark aria-hidden size={ICON_SIZE['3xl']} />}
              headingKey="watchlist.title"
              titleKey="watchlist.signedOutTitle"
              messageKey="watchlist.signedOutMessage"
              returnTo={ROUTES.watchlist}
              maxWidth="var(--container-base)"
            >
              <WatchlistPage />
            </SessionGate>
          }
        />
        <Route
          path={ROUTES.notifications}
          element={
            <SessionGate
              icon={<Inbox size={ICON_SIZE['3xl']} aria-hidden />}
              headingKey="notifications.inboxTitle"
              titleKey="notifications.signedOutTitle"
              messageKey="notifications.signedOutMessage"
              returnTo={ROUTES.notifications}
            >
              <NotificationsPage />
            </SessionGate>
          }
        />
        <Route path={ROUTES.eventDetailPattern} element={<EventDetail />} />
        <Route path={ROUTES.nightRecapPattern} element={<NightRecapPage />} />
        <Route path={ROUTES.profileMoviesPattern} element={<ProfileMoviesPage />} />
        <Route path={ROUTES.profileWatchlistPattern} element={<ProfileWatchlistPage />} />
        <Route path={ROUTES.profilePattern} element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function AppRoutesWithErrorBoundary() {
  const location = useLocation();
  useHomeShowcasePrefetch();
  return (
    <>
      <ScrollToTop />
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<PageFallback />}>
          <AppRoutes />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <ConsentProvider>
            <AuthProvider>
              <UserThemeSync />
              <AnalyticsSync />
              {children}
            </AuthProvider>
          </ConsentProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutesWithErrorBoundary />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
