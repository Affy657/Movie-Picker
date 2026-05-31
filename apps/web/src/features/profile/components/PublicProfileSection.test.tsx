import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import PublicProfileSection from '@/features/profile/components/PublicProfileSection';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { setSessionHint } from '@/features/auth/session-hint';

const baseUser = {
  userId: 'u1',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  avatarId: 'alpha',
  handle: 'alice',
  bio: 'Ma bio',
  isProfilePublic: true,
};

function renderSection() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <PublicProfileSection />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('PublicProfileSection (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(baseUser)));
  });

  it('pré-remplit le handle, la bio et la visibilité depuis le compte', async () => {
    renderSection();

    const handleInput = await screen.findByLabelText(/identifiant public/i);
    await waitFor(() => expect(handleInput).toHaveValue('alice'));
    expect(screen.getByLabelText(/bio/i)).toHaveValue('Ma bio');
    expect(screen.getByRole('checkbox', { name: /rendre mon profil public/i })).toBeChecked();
  });

  it('enregistre la bio et la visibilité via PATCH', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseUser, isProfilePublic: false });
      })
    );

    renderSection();
    await screen.findByDisplayValue('alice');

    await user.click(screen.getByRole('checkbox', { name: /rendre mon profil public/i }));
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => expect(patchBody).not.toBeNull());
    expect(patchBody!.isProfilePublic).toBe(false);
  });

  it('signale un handle déjà pris', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/users/handle-available`, () =>
        HttpResponse.json({ handle: 'taken', available: false, reason: 'Ce handle est déjà pris.' })
      )
    );

    renderSection();
    const handleInput = await screen.findByLabelText(/identifiant public/i);
    await waitFor(() => expect(handleInput).toHaveValue('alice'));

    await user.clear(handleInput);
    await user.type(handleInput, 'taken');

    await waitFor(() => {
      expect(screen.getByText(/déjà pris/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });
});
