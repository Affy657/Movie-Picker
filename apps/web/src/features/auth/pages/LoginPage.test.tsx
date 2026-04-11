import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import LoginPage from '@/features/auth/pages/LoginPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

function renderLogin(initialPath = '/connexion') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/" element={<h1>Accueil test</h1>} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('LoginPage (MSW)', () => {
  const server = setupServer();
  let sessionActive = false;

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    sessionActive = false;
    localStorage.setItem('moviepicker-locale', 'fr');
  });
  afterEach(() => {
    server.resetHandlers();
    sessionActive = false;
  });
  afterAll(() => server.close());

  it('soumet le formulaire, appelle login et redirige vers returnTo', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionActive
          ? HttpResponse.json({
              userId: 'u-login',
              displayName: 'Lee',
              emailMasked: 'l***@test.local',
              uiTheme: 'system',
            })
          : HttpResponse.json({ error: '401' }, { status: 401 })
      ),
      http.post(`${TEST_API_V1}/auth/login`, async () => {
        sessionActive = true;
        return HttpResponse.json({});
      })
    );

    renderLogin('/connexion?returnTo=%2F');

    await user.type(screen.getByLabelText(/^e-mail$/i), 'lee@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcd1234');
    await user.click(screen.getByRole('button', { name: /^se connecter$/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Accueil test' })).toBeInTheDocument();
    });
  });
});
