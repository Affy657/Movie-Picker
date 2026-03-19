import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Home from './pages/Home';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';

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
      <Route path="/" element={<Home />} />
      <Route path="/new" element={<CreateEvent />} />
      <Route path="/s/:slug" element={<EventDetail />} />
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
        <BrowserRouter>
          <AppRoutesWithErrorBoundary />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
