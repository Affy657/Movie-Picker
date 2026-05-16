import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
  } as unknown as Response;
}

function Probe() {
  const { user, isHydrating } = useAuth();
  if (isHydrating) return <Text>hydrating</Text>;
  return <Text>{user ? `user:${user.displayName}` : 'guest'}</Text>;
}

describe('AuthProvider', () => {
  it('hydrates as guest when /auth/me returns 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { title: 'Unauthorized' }));

    const { getByText } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => getByText('guest'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('hydrates as authenticated user when /auth/me returns 200', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { userId: 'u1', displayName: 'Alice', emailMasked: 'a***@ex.com' })
    );

    const { getByText } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => getByText('user:Alice'));
  });

  it('clears user on logout', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { userId: 'u1', displayName: 'Alice' }))
      .mockResolvedValueOnce(jsonResponse(204, null));

    let logoutFn: (() => Promise<void>) | null = null;
    function Capture() {
      const auth = useAuth();
      logoutFn = auth.logout;
      return <Text>{auth.user ? auth.user.displayName ?? '' : 'guest'}</Text>;
    }

    const { getByText } = render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );

    await waitFor(() => getByText('Alice'));

    await act(async () => {
      await logoutFn?.();
    });

    await waitFor(() => getByText('guest'));
  });
});
