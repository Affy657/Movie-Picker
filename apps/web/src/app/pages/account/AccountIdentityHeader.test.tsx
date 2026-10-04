import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountIdentityHeader from '@/app/pages/account/AccountIdentityHeader';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { buildUserProfile } from '@/test-utils/userProfile';

const PHOTO_ID = 'photo:0123456789abcdef0123456789abcdef';

const user = buildUserProfile({ avatarPhotoId: PHOTO_ID });

describe('AccountIdentityHeader', () => {
  const server = setupServer();
  const patches: unknown[] = [];

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    patches.length = 0;
  });
  afterAll(() => server.close());

  function renderHeader() {
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json(user);
      })
    );
    render(
      <AppTestProviders>
        <MemoryRouter>
          <AccountIdentityHeader user={user} />
        </MemoryRouter>
      </AppTestProviders>
    );
  }

  it('choosing a robot sends the robot', async () => {
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: 'Avatar' }));

    await userEvent.click(screen.getByRole('radio', { name: 'Choisir l’avatar alpha' }));

    await waitFor(() => expect(patches).toEqual([{ avatarId: 'alpha' }]));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('choosing the kept photo asks to use it again', async () => {
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: 'Avatar' }));
    await userEvent.click(screen.getByRole('tab', { name: '📷 Ma photo' }));

    await userEvent.click(screen.getByRole('radio', { name: 'Utiliser ma photo' }));

    await waitFor(() => expect(patches).toEqual([{ useAvatarPhoto: true }]));
  });
});
