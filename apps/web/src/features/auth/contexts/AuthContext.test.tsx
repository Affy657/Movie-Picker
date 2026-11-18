import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/features/auth/contexts/AuthContext';
import {
  fetchAuthMeForSession,
  postAuthLogin,
  postAuthLogout,
  postAuthRegister,
} from '@/features/auth/api/authApi';
import {
  clearPendingSignOut,
  hasPendingSignOut,
  markSignOutPending,
} from '@/features/auth/session-hint';
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
const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/shared/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track }) }));

type Logout = () => Promise<void>;

function ExposeLogout({ onLogout }: Readonly<{ onLogout: (logout: Logout) => void }>) {
  onLogout(useAuth().logout);
  return null;
}

function ExposeUser({ onUser }: Readonly<{ onUser: (user: UserProfile | null) => void }>) {
  onUser(useAuth().user);
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
    vi.mocked(postAuthLogout).mockRejectedValueOnce(new ApiError('Server error', { code: 500 }));
    const logout = await renderLogout();

    await act(async () => {
      await expect(logout()).rejects.toThrow('Server error');
    });

    expect(postAuthLogout).toHaveBeenCalledTimes(1);
    expect(dropBrowserPushSubscription).toHaveBeenCalledTimes(1);
  });

  it('signs this tab out when the server already revoked the session', async () => {
    vi.mocked(postAuthLogout).mockRejectedValueOnce(new ApiError('Session expired', { code: 401 }));
    let logout: Logout | undefined;
    let user: UserProfile | null | undefined;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <ExposeLogout
            onLogout={(fn) => {
              logout = fn;
            }}
          />
          <ExposeUser
            onUser={(value) => {
              user = value;
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(user?.userId).toBe('u1'));

    await act(async () => {
      await logout!();
    });

    expect(user).toBeNull();
    expect(dropBrowserPushSubscription).toHaveBeenCalled();
    expect(hasPendingSignOut()).toBe(false);
  });
});

describe('AuthProvider unconfirmed sign-out', () => {
  const offline = new ApiError('Network error', { code: 0 });

  function ExposeAuth({
    onAuth,
  }: Readonly<{ onAuth: (auth: ReturnType<typeof useAuth>) => void }>) {
    onAuth(useAuth());
    return null;
  }

  async function renderAuth(): Promise<() => ReturnType<typeof useAuth>> {
    let auth: ReturnType<typeof useAuth> | undefined;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <ExposeAuth
            onAuth={(value) => {
              auth = value;
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(auth).toBeDefined());
    return () => auth!;
  }

  function networkComesBack(): Promise<void> {
    return act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    vi.mocked(postAuthLogout).mockClear();
  });

  afterEach(() => {
    clearPendingSignOut();
    vi.mocked(fetchAuthMeForSession).mockReset();
    vi.mocked(fetchAuthMeForSession).mockImplementation(
      async () => ({ userId: 'u1' }) as UserProfile
    );
  });

  it('signs this tab out and owns up that the server never heard of it', async () => {
    const auth = await renderAuth();
    await waitFor(() => expect(auth().user?.userId).toBe('u1'));
    vi.mocked(postAuthLogout).mockRejectedValueOnce(offline);

    await act(async () => {
      await auth().logout();
    });

    expect(auth().user).toBeNull();
    expect(auth().signOutPending).toBe(true);
    expect(hasPendingSignOut()).toBe(true);
  });

  it('replays the sign-out when the network comes back', async () => {
    const auth = await renderAuth();
    await waitFor(() => expect(auth().user?.userId).toBe('u1'));
    vi.mocked(postAuthLogout).mockRejectedValueOnce(offline);
    await act(async () => {
      await auth().logout();
    });
    vi.mocked(postAuthLogout).mockClear();
    vi.mocked(postAuthLogout).mockResolvedValueOnce(undefined);

    await networkComesBack();

    await waitFor(() => expect(auth().signOutPending).toBe(false));
    expect(postAuthLogout).toHaveBeenCalledTimes(1);
    expect(hasPendingSignOut()).toBe(false);
  });

  it('replays the sign-out at the next page load', async () => {
    markSignOutPending();
    vi.mocked(fetchAuthMeForSession).mockResolvedValue(null);

    const auth = await renderAuth();

    await waitFor(() => expect(auth().signOutPending).toBe(false));
    expect(postAuthLogout).toHaveBeenCalledTimes(1);
    expect(hasPendingSignOut()).toBe(false);
  });

  it('settles when the replay finds the session already gone', async () => {
    markSignOutPending();
    vi.mocked(fetchAuthMeForSession).mockResolvedValue(null);
    vi.mocked(postAuthLogout).mockRejectedValueOnce(new ApiError('Gone', { code: 401 }));

    const auth = await renderAuth();

    await waitFor(() => expect(auth().signOutPending).toBe(false));
    expect(hasPendingSignOut()).toBe(false);
  });

  it.each([
    ['the network is still down', offline],
    ['the server still fails', new ApiError('Server error', { code: 500 })],
  ])('keeps the sign-out pending while %s', async (_case, failure) => {
    markSignOutPending();
    vi.mocked(fetchAuthMeForSession).mockResolvedValue(null);
    vi.mocked(postAuthLogout).mockRejectedValueOnce(failure);

    const auth = await renderAuth();

    await waitFor(() => expect(postAuthLogout).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(auth().signOutPending).toBe(true);
    expect(hasPendingSignOut()).toBe(true);
  });

  it('sends one replay when the network comes back during the first one', async () => {
    markSignOutPending();
    vi.mocked(fetchAuthMeForSession).mockResolvedValue(null);
    let finishReplay: () => void = () => {};
    vi.mocked(postAuthLogout).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishReplay = resolve;
      })
    );

    const auth = await renderAuth();
    await waitFor(() => expect(postAuthLogout).toHaveBeenCalledTimes(1));
    await networkComesBack();
    await act(async () => {
      finishReplay();
      await Promise.resolve();
    });

    await waitFor(() => expect(auth().signOutPending).toBe(false));
    expect(postAuthLogout).toHaveBeenCalledTimes(1);
  });

  it('asks nothing of the server when no sign-out is pending', async () => {
    await renderAuth();

    await networkComesBack();

    expect(postAuthLogout).not.toHaveBeenCalled();
  });

  it.each([
    ['signing in', (auth: ReturnType<typeof useAuth>) => auth.login('a@test.local', 'secret')],
    [
      'signing up',
      (auth: ReturnType<typeof useAuth>) => auth.register('a@test.local', 'secret', 'Alice'),
    ],
  ])('drops the pending sign-out notice once %s again', async (_case, signIn) => {
    markSignOutPending();
    vi.mocked(fetchAuthMeForSession).mockResolvedValue(null);
    vi.mocked(postAuthLogout).mockRejectedValueOnce(offline);
    const auth = await renderAuth();
    await waitFor(() => expect(postAuthLogout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(auth().isLoading).toBe(false));
    expect(auth().signOutPending).toBe(true);
    vi.mocked(fetchAuthMeForSession).mockResolvedValue({ userId: 'u1' } as UserProfile);

    await act(async () => {
      await signIn(auth());
    });

    await waitFor(() => expect(auth().user?.userId).toBe('u1'));
    expect(auth().signOutPending).toBe(false);
  });
});

describe('AuthProvider in several tabs', () => {
  it('follows a session that another tab just ended', async () => {
    const client = new QueryClient();
    let auth: ReturnType<typeof useAuth> | undefined;
    function ExposeAuth() {
      auth = useAuth();
      return null;
    }
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <ExposeAuth />
        </AuthProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(auth?.user?.userId).toBe('u1'));
    vi.mocked(fetchAuthMeForSession).mockResolvedValueOnce(null);

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'mp.session-hint' }));
    });

    await waitFor(() => expect(auth?.user).toBeNull());
  });

  it('shows the pending sign-out another tab left', async () => {
    let auth: ReturnType<typeof useAuth> | undefined;
    function ExposeAuth() {
      auth = useAuth();
      return null;
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <ExposeAuth />
        </AuthProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(auth?.user?.userId).toBe('u1'));

    act(() => {
      markSignOutPending();
      window.dispatchEvent(new StorageEvent('storage', { key: 'mp.sign-out-pending' }));
    });

    expect(auth?.signOutPending).toBe(true);
    clearPendingSignOut();
  });
});

describe('AuthProvider sign in', () => {
  it('forgets what a night looked like signed out, so it knows the participant on return', async () => {
    const client = new QueryClient();
    const nightKey = queryKeys.event.detail('soiree', null);
    client.setQueryData(nightKey, { slug: 'soiree', myParticipant: null });
    let login: ReturnType<typeof useAuth>['login'] | undefined;
    function ExposeLogin() {
      login = useAuth().login;
      return null;
    }
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <ExposeLogin />
        </AuthProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(login).toBeDefined());

    await act(async () => {
      await login!('a@test.local', 'secret');
    });

    expect(client.getQueryState(nightKey)?.isInvalidated).toBe(true);
  });

  describe('from a visitor session', () => {
    const publicListKey = queryKeys.lists.publicDetail('lea', 'l1');

    afterEach(() => {
      sessionStorage.clear();
    });

    async function renderVisitor(client: QueryClient) {
      vi.mocked(fetchAuthMeForSession).mockResolvedValueOnce(null);
      let auth: ReturnType<typeof useAuth> | undefined;
      function ExposeAuth() {
        auth = useAuth();
        return null;
      }
      render(
        <QueryClientProvider client={client}>
          <AuthProvider>
            <ExposeAuth />
          </AuthProvider>
        </QueryClientProvider>
      );
      await waitFor(() => expect(auth?.isLoading).toBe(false));
      expect(auth?.user).toBeNull();
      return () => auth!;
    }

    it('forgets what the pages computed for the visitor, but keeps her night identities', async () => {
      const client = new QueryClient();
      const auth = await renderVisitor(client);
      client.setQueryData(publicListKey, { id: 'l1', watchedCount: null });
      setStoredParticipant('soiree', 'p1', 'Alice');

      await act(async () => {
        await auth().login('a@test.local', 'secret');
      });

      await waitFor(() => expect(auth().user?.userId).toBe('u1'));
      await waitFor(() => expect(client.getQueryData(publicListKey)).toBeUndefined());
      expect(getStoredParticipant('soiree')).not.toBeNull();
    });

    it('keeps what was loaded while the session was still being checked', async () => {
      const client = new QueryClient();
      client.setQueryData(publicListKey, { id: 'l1', watchedCount: 1 });
      let user: UserProfile | null | undefined;
      render(
        <QueryClientProvider client={client}>
          <AuthProvider>
            <ExposeUser
              onUser={(value) => {
                user = value;
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => expect(user?.userId).toBe('u1'));
      await act(async () => {});

      expect(client.getQueryData(publicListKey)).toEqual({ id: 'l1', watchedCount: 1 });
    });
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

describe('AuthProvider sign-in measure', () => {
  async function renderAuthProvider(): Promise<() => ReturnType<typeof useAuth>> {
    let auth: ReturnType<typeof useAuth> | undefined;
    function ExposeAuth() {
      auth = useAuth();
      return null;
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <ExposeAuth />
        </AuthProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(auth).toBeDefined());
    return () => auth!;
  }

  beforeEach(() => {
    track.mockClear();
    vi.mocked(fetchAuthMeForSession).mockResolvedValue({ userId: 'u1' } as UserProfile);
  });

  it('tells the server and the measure where a new account was heading', async () => {
    const auth = await renderAuthProvider();

    await act(async () => {
      await auth().register('a@test.local', 'secret1', 'Alice', '/e/soiree');
    });

    expect(postAuthRegister).toHaveBeenCalledWith('a@test.local', 'secret1', 'Alice', '/e/soiree');
    expect(track).toHaveBeenCalledWith('user_signed_up', { method: 'email', origin: 'event' });
  });

  it('tells the server and the measure where a returning account was heading', async () => {
    const auth = await renderAuthProvider();

    await act(async () => {
      await auth().login('a@test.local', 'secret1', '/r/recap');
    });

    expect(postAuthLogin).toHaveBeenCalledWith('a@test.local', 'secret1', '/r/recap');
    expect(track).toHaveBeenCalledWith('user_logged_in', { method: 'email', origin: 'recap' });
  });

  it('reads a sign-in without destination as coming from elsewhere', async () => {
    const auth = await renderAuthProvider();

    await act(async () => {
      await auth().login('a@test.local', 'secret1');
    });

    expect(track).toHaveBeenCalledWith('user_logged_in', { method: 'email', origin: 'other' });
  });
});
