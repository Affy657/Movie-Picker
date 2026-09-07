import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
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
        <Route path={ROUTES.discover} element={<LandingPage />} />
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
        <Route path={ROUTES.createEvent} element={<CreateEvent />} />
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
        <Route path={ROUTES.myEvents} element={<MyEventsPage />} />
        <Route path={ROUTES.watchlist} element={<WatchlistPage />} />
        <Route path={ROUTES.notifications} element={<NotificationsPage />} />
        <Route path={ROUTES.eventDetailPattern} element={<EventDetail />} />
        <Route path={ROUTES.profileMoviesPattern} element={<ProfileMoviesPage />} />
        <Route path={ROUTES.profilePattern} element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </SentryRoutes>
  );
}

function AppRoutesWithErrorBoundary() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<PageFallback />}>
        <AppRoutes />
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <ConsentProvider>
            <AuthProvider>
              <UserThemeSync />
              <AnalyticsSync />
              <BrowserRouter>
                <AppRoutesWithErrorBoundary />
              </BrowserRouter>
            </AuthProvider>
          </ConsentProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export default App;
