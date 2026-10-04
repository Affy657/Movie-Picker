import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { useAvatarPhotoActions } from '@/features/auth/hooks/useAvatarPhotoActions';
import { QueryClientWrapper, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { buildUserProfile } from '@/test-utils/userProfile';
import type { UserProfile } from '@/features/auth/types';

const PHOTO_ID = 'photo:0123456789abcdef0123456789abcdef';

const profile = buildUserProfile();

describe('useAvatarPhotoActions', () => {
  const server = setupServer();
  const received: unknown[] = [];

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    received.length = 0;
  });
  afterAll(() => server.close());

  function renderActions() {
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.auth.me, profile);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientWrapper client={client}>{children}</QueryClientWrapper>
    );
    return { client, ...renderHook(() => useAvatarPhotoActions(), { wrapper }) };
  }

  it('uploads the photo as base64 and refreshes the account with the answer', async () => {
    server.use(
      http.put(`${TEST_API_V1}/users/me/avatar-photo`, async ({ request }) => {
        received.push(await request.json());
        return HttpResponse.json({ ...profile, avatarId: PHOTO_ID, avatarPhotoId: PHOTO_ID });
      })
    );
    const { client, result } = renderActions();

    await act(() => result.current.uploadPhoto(new Blob(['hello'], { type: 'image/webp' })));

    expect(received).toEqual([{ contentType: 'image/webp', base64Content: 'aGVsbG8=' }]);
    expect(client.getQueryData<UserProfile>(queryKeys.auth.me)?.avatarId).toBe(PHOTO_ID);
  });

  it('deletes the photo and refreshes the account with the answer', async () => {
    server.use(
      http.delete(`${TEST_API_V1}/users/me/avatar-photo`, () =>
        HttpResponse.json({ ...profile, avatarPhotoId: null })
      )
    );
    const { client, result } = renderActions();
    client.setQueryData(queryKeys.auth.me, {
      ...profile,
      avatarId: PHOTO_ID,
      avatarPhotoId: PHOTO_ID,
    });

    await act(() => result.current.deletePhoto());

    expect(client.getQueryData<UserProfile>(queryKeys.auth.me)?.avatarId).toBe('bolt');
  });

  it('lets an upload failure reach the caller', async () => {
    server.use(
      http.put(`${TEST_API_V1}/users/me/avatar-photo`, () =>
        HttpResponse.json({ reason: 'rate_limited' }, { status: 429 })
      )
    );
    const { result } = renderActions();

    await expect(
      act(() => result.current.uploadPhoto(new Blob(['x'], { type: 'image/webp' })))
    ).rejects.toMatchObject({ code: 429 });
  });
});
