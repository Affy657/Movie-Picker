import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

function renderRegister(initialPath = '/register') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<h1>Accueil après inscription</h1>} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('RegisterPage (MSW)', () => {
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

  it('inscription réussie puis navigation vers returnTo', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionActive
          ? HttpResponse.json({
              userId: 'u-reg',
              displayName: 'Sam',
              emailMasked: 's***@test.local',
              uiTheme: 'system',
              accentColor: 'default',
            })
          : HttpResponse.json({ error: '401' }, { status: 401 })
      ),
      http.post(`${TEST_API_V1}/auth/register`, async () => {
        sessionActive = true;
        return HttpResponse.json({}, { status: 201 });
      })
    );

    renderRegister('/register?returnTo=%2F');

    await user.type(screen.getByLabelText(/^pseudo$/i), 'Sam');
    await user.type(screen.getByLabelText(/^e-mail$/i), 'sam@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcd1234');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Accueil après inscription' })
      ).toBeInTheDocument();
    });
  });

  it('n’appelle pas l’API si le mot de passe ne contient pas de chiffre', async () => {
    const user = userEvent.setup();
    let registerPosts = 0;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ error: '401' }, { status: 401 })
      ),
      http.post(`${TEST_API_V1}/auth/register`, async () => {
        registerPosts += 1;
        return HttpResponse.json({}, { status: 201 });
      })
    );

    renderRegister('/register?returnTo=%2F');

    await user.type(screen.getByLabelText(/^pseudo$/i), 'Sam');
    await user.type(screen.getByLabelText(/^e-mail$/i), 'sam@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcdefgh');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(registerPosts).toBe(0);
  });
});
