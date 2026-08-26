import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { LocaleProvider, useTranslation } from '@/shared/i18n';
import { AuthProvider, useAuth } from '@/features/auth/contexts/AuthContext';
import UserThemeSync from '@/app/components/UserThemeSync';
import AnalyticsSync from '@/app/components/AnalyticsSync';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { getInstrumentedRoutes } from '@/shared/observability/sentry';
import AppShell from '@/app/components/AppShell';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';

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

function HomeRoute() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <PageLayout>
        <p className="placeholder">{t('common.loading')}</p>
      </PageLayout>
    );
  }

  if (user) {
    return <Navigate to={ROUTES.myEvents} replace />;
  }

  return <LandingPage />;
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
        <Route path={ROUTES.home} element={<HomeRoute />} />
        <Route
          path={ROUTES.createEvent}
          element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
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
        <Route
          path={ROUTES.account}
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.myEvents}
          element={
            <ProtectedRoute>
              <MyEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.watchlist}
          element={
            <ProtectedRoute>
              <WatchlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.notifications}
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
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
