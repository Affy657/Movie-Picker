import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/features/auth/pages/AccountPage';
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

function renderProfile() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/settings/profil']}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('AccountProfilePage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(baseUser)));
  });

  it('pré-remplit le pseudo, la bio et la visibilité depuis le compte', async () => {
    renderProfile();

    await waitFor(() => expect(screen.getByLabelText(/pseudo/i)).toHaveValue('Alice'));
    expect(screen.getByLabelText(/bio/i)).toHaveValue('Ma bio');
    expect(screen.getByRole('switch', { name: /profil public/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('enregistre le pseudo automatiquement à la perte de focus', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseUser, displayName: 'Alicia' });
      })
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    const pseudoInput = screen.getByLabelText(/pseudo/i);
    await user.clear(pseudoInput);
    await user.type(pseudoInput, 'Alicia');
    await user.tab();

    await waitFor(() => expect(patchBody).not.toBeNull());
    expect(patchBody!.displayName).toBe('Alicia');
    expect(await screen.findByText('Enregistré')).toBeInTheDocument();
  });

  it('enregistre la visibilité immédiatement au changement du bouton', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseUser, isProfilePublic: false });
      })
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    await user.click(screen.getByRole('switch', { name: /profil public/i }));

    await waitFor(() => expect(patchBody).not.toBeNull());
    expect(patchBody!.isProfilePublic).toBe(false);
  });

  it('refuse un pseudo vide', async () => {
    const user = userEvent.setup();
    renderProfile();
    const pseudoInput = await screen.findByLabelText(/pseudo/i);

    await user.clear(pseudoInput);
    await user.tab();

    expect(await screen.findByText('Le pseudo est requis.')).toBeInTheDocument();
  });

  it('affiche le hint bio uniquement dans les 20 derniers caractères', async () => {
    renderProfile();
    const bioInput = await screen.findByLabelText(/bio/i);

    expect(screen.queryByText(/caractères restants/i)).toBeNull();

    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, 'x'.repeat(125));

    await waitFor(() => {
      expect(screen.getByText(/caractères restants/i)).toBeInTheDocument();
    });
  });
});
