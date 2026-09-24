import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/features/auth/contexts/AuthContext';
import { fetchAuthMeForSession, postAuthLogout } from '@/features/auth/api/authApi';
import type { UserProfile } from '@/features/auth/types';
import { ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { dropBrowserPushSubscription } from '@/shared/utils/browserPushSubscription';
import { getStoredParticipant, setStoredParticipant } from '@/shared/utils/eventIdentityStorage';

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

describe('AuthProvider session end', () => {
  const accountDataKey = queryKeys.watchlist.list;

  function ExposeAuth({
    onAuth,
  }: Readonly<{ onAuth: (auth: ReturnType<typeof useAuth>) => void }>) {
    onAuth(useAuth());
    return null;
  }

  async function renderSignedIn(client: QueryClient) {
    let auth: ReturnType<typeof useAuth> | undefined;
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <ExposeAuth
            onAuth={(value) => {
              auth = value;
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(auth?.user?.userId).toBe('u1'));
    client.setQueryData(accountDataKey, [{ tmdbId: 603 }]);
    setStoredParticipant('soiree-u1', 'p1', 'Alice');
    return () => auth!;
  }

  afterEach(() => {
    sessionStorage.clear();
  });

  it('forgets the account data of this tab once the session check answers signed out', async () => {
    const client = new QueryClient();
    await renderSignedIn(client);
    vi.mocked(fetchAuthMeForSession).mockResolvedValueOnce(null);

    await act(async () => {
      await client.invalidateQueries({ queryKey: queryKeys.auth.me });
    });

    await waitFor(() => expect(client.getQueryData(accountDataKey)).toBeUndefined());
    expect(getStoredParticipant('soiree-u1')).toBeNull();
  });

  it('forgets the account data of this tab when another screen drops the session', async () => {
    const client = new QueryClient();
    await renderSignedIn(client);

    act(() => {
      client.setQueryData(queryKeys.auth.me, null);
    });

    await waitFor(() => expect(client.getQueryData(accountDataKey)).toBeUndefined());
    expect(getStoredParticipant('soiree-u1')).toBeNull();
  });

  it('does not hand the account data of this tab over to the next account', async () => {
    const client = new QueryClient();
    const auth = await renderSignedIn(client);
    vi.mocked(fetchAuthMeForSession).mockResolvedValueOnce({ userId: 'u2' } as UserProfile);

    await act(async () => {
      await client.invalidateQueries({ queryKey: queryKeys.auth.me });
    });

    await waitFor(() => expect(auth().user?.userId).toBe('u2'));
    await waitFor(() => expect(client.getQueryData(accountDataKey)).toBeUndefined());
    expect(getStoredParticipant('soiree-u1')).toBeNull();
  });

  it('ends the session through one call that signs out and forgets the account data', async () => {
    const client = new QueryClient();
    const auth = await renderSignedIn(client);

    await act(async () => {
      await auth().endSession();
    });

    expect(auth().user).toBeNull();
    expect(client.getQueryData(accountDataKey)).toBeUndefined();
    expect(getStoredParticipant('soiree-u1')).toBeNull();
  });
});
