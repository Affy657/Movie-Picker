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
import { getInstrumentedRoutes } from '@/shared/observability/sentry';
import AppShell from '@/app/components/AppShell';
import SessionGate from '@/app/components/SessionGate';
import ScrollToTop from '@/app/components/ScrollToTop';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';

const HomePage = lazy(() => import('@/app/pages/HomePage'));
const ShowcaseListPage = lazy(() => import('@/app/pages/ShowcaseListPage'));
const MovieCollectionsPage = lazy(() => import('@/app/pages/MovieCollectionsPage'));
const LandingPage = lazy(() => import('@/app/pages/LandingPage'));
const CreateEvent = lazy(() => import('@/features/events/pages/CreateEvent'));
const EventDetail = lazy(() => import('@/features/events/pages/EventDetail'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const OAuthCallbackPage = lazy(() => import('@/features/auth/pages/OAuthCallbackPage'));
const AccountPage = lazy(() => import('@/features/auth/pages/AccountPage'));
const LegalNoticePage = lazy(() => import('@/app/pages/LegalNoticePage'));
const PrivacyPolicyPage = lazy(() => import('@/app/pages/PrivacyPolicyPage'));
const DonatePage = lazy(() => import('@/app/pages/DonatePage'));
const TechPage = lazy(() => import('@/app/pages/TechPage'));
const MyEventsPage = lazy(() => import('@/features/events/pages/MyEventsPage'));
const WatchlistPage = lazy(() => import('@/features/watchlist/pages/WatchlistPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const ProfileMoviesPage = lazy(() => import('@/features/profile/pages/ProfileMoviesPage'));
const NotFoundPage = lazy(() => import('@/app/pages/NotFoundPage'));

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

const SentryRoutes = getInstrumentedRoutes(Routes);

export function AppRoutes() {
  return (
    <SentryRoutes>
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
              icon={<CalendarPlus size={26} aria-hidden />}
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
              icon={<CalendarPlus size={26} aria-hidden />}
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
              icon={<Bookmark aria-hidden size={28} />}
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
              icon={<Inbox size={26} aria-hidden />}
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
        <Route path={ROUTES.profileMoviesPattern} element={<ProfileMoviesPage />} />
        <Route path={ROUTES.profilePattern} element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </SentryRoutes>
  );
}

export function AppRoutesWithErrorBoundary() {
  const location = useLocation();
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

export function AppProviders({ children }: { children: ReactNode }) {
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
