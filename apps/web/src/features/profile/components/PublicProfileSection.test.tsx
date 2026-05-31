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

  it('pré-remplit le pseudo, la bio et la visibilité depuis le compte', async () => {
    renderSection();

    await waitFor(() => expect(screen.getByLabelText(/pseudo/i)).toHaveValue('Alice'));
    expect(screen.getByLabelText(/bio/i)).toHaveValue('Ma bio');
    expect(screen.getByRole('switch', { name: /rendre mon profil public/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('enregistre le pseudo, la bio et la visibilité via PATCH', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseUser, isProfilePublic: false });
      })
    );

    renderSection();
    await screen.findByDisplayValue('Alice');

    await user.click(screen.getByRole('switch', { name: /rendre mon profil public/i }));
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => expect(patchBody).not.toBeNull());
    expect(patchBody!.isProfilePublic).toBe(false);
    expect(patchBody!.displayName).toBe('Alice');
  });

  it('affiche le hint bio uniquement dans les 20 derniers caractères', async () => {
    renderSection();
    const bioInput = await screen.findByLabelText(/bio/i);

    expect(screen.queryByText(/caractères restants/i)).toBeNull();

    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, 'x'.repeat(125));

    await waitFor(() => {
      expect(screen.getByText(/caractères restants/i)).toBeInTheDocument();
    });
  });
});
