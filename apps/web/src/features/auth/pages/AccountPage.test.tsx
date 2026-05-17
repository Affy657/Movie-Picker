import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/features/auth/pages/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

function renderAccount() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('AccountPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    localStorage.setItem('moviepicker-ui-preference', 'light');
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche les préférences (langue + thème) et envoie uiTheme au PATCH profil', async () => {
    const user = userEvent.setup();
    let patchedTheme: string | undefined;

    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u-acc',
          displayName: 'Pat',
          emailMasked: 'p***@test.local',
          uiTheme: 'light',
          accentColor: 'default',
        })
      ),
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as { uiTheme?: string };
        patchedTheme = body.uiTheme;
        return HttpResponse.json({
          userId: 'u-acc',
          displayName: 'Pat',
          emailMasked: 'p***@test.local',
          uiTheme: body.uiTheme ?? 'light',
        });
      })
    );

    renderAccount();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Mon compte' })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Préférences' })).toBeInTheDocument();

    // Le ThemeToggle est maintenant un radiogroup segmenté (Système / Clair / Sombre)
    // aligné sur le rendu mobile — voir apps/mobile/app/(authed)/settings.tsx.
    const darkRadio = await screen.findByRole('radio', { name: /sombre/i });
    await user.click(darkRadio);
    await waitFor(() => expect(patchedTheme).toBe('dark'));
  });
});
