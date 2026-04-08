import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import UserThemeSync from './components/UserThemeSync';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppShell from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import Home from './pages/Home';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccountPage from './pages/AccountPage';
import MyEventsPage from './pages/MyEventsPage';

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
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<CreateEvent />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/compte" element={<AccountPage />} />
        <Route
          path="/mes-soirees"
          element={
            <ProtectedRoute>
              <MyEventsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/s/:slug" element={<EventDetail />} />
      </Route>
    </Routes>
  );
}

/** Error boundary par « page » : `key={pathname}` remonte le boundary au changement de route (roadmap § 30). */
function AppRoutesWithErrorBoundary() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <AppRoutes />
    </ErrorBoundary>
  );
}

function App() {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UserThemeSync />
          <BrowserRouter>
            <AppRoutesWithErrorBoundary />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
