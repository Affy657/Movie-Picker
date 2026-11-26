import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { buildUserProfile } from '@/test-utils/userProfile';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useDimWatched } from './useDimWatched';

const profile = buildUserProfile({
  userId: 'u1',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  ratingScale: 'ten',
  dimWatched: false,
});

const signedIn = http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(profile));

function wrapper({ children }: { children: ReactNode }) {
  return <AppTestProviders>{children}</AppTestProviders>;
}

function useSignedInDimWatched() {
  return { ...useDimWatched(), signedIn: useAuth().user !== null };
}

describe('useDimWatched', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('dims at once and saves the choice on the account', async () => {
    let patched: unknown = null;
    server.use(
      signedIn,
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patched = await request.json();
        await new Promise(() => undefined);
      })
    );
    const { result } = renderHook(() => useSignedInDimWatched(), { wrapper });
    await waitFor(() => expect(result.current.signedIn).toBe(true));
    expect(result.current.enabled).toBe(false);

    act(() => result.current.change(true));

    await waitFor(() => expect(result.current.enabled).toBe(true));
    await waitFor(() => expect(patched).toEqual({ dimWatched: true }));
  });

  it('puts the choice back and says so when it is not saved', async () => {
    server.use(
      signedIn,
      http.patch(`${TEST_API_V1}/auth/me`, () => apiErrorJson(500, 'internal_error'))
    );
    const { result } = renderHook(() => useSignedInDimWatched(), { wrapper });
    await waitFor(() => expect(result.current.signedIn).toBe(true));

    act(() => result.current.change(true));

    await waitFor(() => expect(result.current.error).toBe('Préférence non enregistrée.'));
    expect(result.current.enabled).toBe(false);
  });
});
