import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/features/auth/contexts/AuthContext';
import { postAuthLogout } from '@/features/auth/api/authApi';
import { ApiError } from '@/shared/api/apiError';
import { dropBrowserPushSubscription } from '@/shared/utils/browserPushSubscription';

vi.mock('@/features/auth/api/authApi', () => ({
  fetchAuthMeForSession: vi.fn(async () => ({ userId: 'u1' })),
  patchAuthProfile: vi.fn(),
  postAuthLogin: vi.fn(),
  postAuthLogout: vi.fn(async () => undefined),
  postAuthRegister: vi.fn(),
}));
vi.mock('@/shared/utils/browserPushSubscription', () => ({
  dropBrowserPushSubscription: vi.fn(async () => undefined),
}));
vi.mock('@/shared/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));

type Logout = () => Promise<void>;

function ExposeLogout({ onLogout }: Readonly<{ onLogout: (logout: Logout) => void }>) {
  onLogout(useAuth().logout);
  return null;
}

async function renderLogout(): Promise<Logout> {
  let logout: Logout | undefined;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <ExposeLogout
          onLogout={(fn) => {
            logout = fn;
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(logout).toBeDefined());
  return () => logout!();
}

describe('AuthProvider logout', () => {
  it('drops the push subscription of this browser along with the session', async () => {
    const logout = await renderLogout();

    await act(async () => {
      await logout();
    });

    expect(postAuthLogout).toHaveBeenCalledTimes(1);
    expect(dropBrowserPushSubscription).toHaveBeenCalledTimes(1);
  });

  it('still drops the push subscription when the server refuses the logout', async () => {
    vi.mocked(postAuthLogout).mockRejectedValueOnce(new ApiError('Session expired', { code: 401 }));
    const logout = await renderLogout();

    await act(async () => {
      await expect(logout()).rejects.toThrow('Session expired');
    });

    expect(postAuthLogout).toHaveBeenCalledTimes(1);
    expect(dropBrowserPushSubscription).toHaveBeenCalledTimes(1);
  });
});
