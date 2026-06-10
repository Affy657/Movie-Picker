import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/contexts/AuthContext';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { LocaleProvider } from '@/shared/i18n';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
}

export function QueryClientWrapper({
  children,
  client,
}: Readonly<{
  children: ReactNode;
  client?: QueryClient;
}>) {
  const qc = client ?? createTestQueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

export function withQueryClient(element: ReactElement, client?: QueryClient) {
  return <QueryClientWrapper client={client}>{element}</QueryClientWrapper>;
}

export function AppTestProviders({
  children,
  client,
}: Readonly<{
  children: ReactNode;
  client?: QueryClient;
}>) {
  return (
    <QueryClientWrapper client={client}>
      <LocaleProvider>
        <ThemeProvider>
          <ConsentProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConsentProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientWrapper>
  );
}
