import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';

function renderForgot(initialPath = '/forgot-password') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<h1>Login test</h1>} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ForgotPasswordPage', () => {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    server.use(authMeGuestHandler);
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le titre et le formulaire en FR', () => {
    renderForgot();
    expect(screen.getByRole('heading', { name: /mot de passe oublié/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^e-mail$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recevoir le lien/i })).toBeInTheDocument();
  });

  it('soumet le formulaire et appelle l API avec email + locale', async () => {
    const user = userEvent.setup();
    let captured: { email?: string; locale?: string } | null = null;
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/request`, async ({ request }) => {
        captured = (await request.json()) as { email: string; locale: string };
        return HttpResponse.json({}, { status: 202 });
      })
    );
    renderForgot();
    await user.type(screen.getByLabelText(/^e-mail$/i), 'alice@test.local');
    await user.click(screen.getByRole('button', { name: /recevoir le lien/i }));
    await waitFor(() => {
      expect(captured?.email).toBe('alice@test.local');
      expect(captured?.locale).toBe('fr');
    });
  });

  it('après soumission OK, affiche l écran de succès avec lien retour', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/request`, () =>
        HttpResponse.json({}, { status: 202 })
      )
    );
    renderForgot();
    await user.type(screen.getByLabelText(/^e-mail$/i), 'someone@test.local');
    await user.click(screen.getByRole('button', { name: /recevoir le lien/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /vérifie ta boîte mail/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /retour à la connexion/i })).toBeInTheDocument();
  });

  it('affiche le fallback erreur si l API échoue', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/request`, () =>
        HttpResponse.json({ error: 'rate-limited' }, { status: 429 })
      )
    );
    renderForgot();
    await user.type(screen.getByLabelText(/^e-mail$/i), 'someone@test.local');
    await user.click(screen.getByRole('button', { name: /recevoir le lien/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { name: /vérifie ta boîte mail/i })
    ).not.toBeInTheDocument();
  });

  it('email vide : empêche la soumission HTML5 (champ required)', () => {
    renderForgot();
    const emailInput = screen.getByLabelText(/^e-mail$/i) as HTMLInputElement;
    expect(emailInput.required).toBe(true);
  });
});
