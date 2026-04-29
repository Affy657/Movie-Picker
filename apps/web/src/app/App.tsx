import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { LocaleProvider, useTranslation } from '@/shared/i18n';
import { AuthProvider } from '@/features/auth/contexts/AuthContext';
import UserThemeSync from '@/app/components/UserThemeSync';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import AppShell from '@/app/components/AppShell';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';

const Home = lazy(() => import('@/app/pages/Home'));
const CreateEvent = lazy(() => import('@/features/events/pages/CreateEvent'));
const EventDetail = lazy(() => import('@/features/events/pages/EventDetail'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const AccountPage = lazy(() => import('@/features/auth/pages/AccountPage'));
const MyEventsPage = lazy(() => import('@/features/events/pages/MyEventsPage'));
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
        staleTime: 0,
      },
    },
  });
}

/** Routes de l’app (pour tests avec MemoryRouter). */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={ROUTES.home} element={<Home />} />
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
        <Route path={ROUTES.account} element={<AccountPage />} />
        <Route path={ROUTES.myEvents} element={<MyEventsPage />} />
        <Route path={ROUTES.eventDetailPattern} element={<EventDetail />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

/** Error boundary par « page » : `key={pathname}` remonte le boundary au changement de route (roadmap § 30). */
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
          <AuthProvider>
            <UserThemeSync />
            <BrowserRouter>
              <AppRoutesWithErrorBoundary />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export default App;
