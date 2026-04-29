import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1, authMeGuestHandler } from '@/mocks/handlers';

function renderReset(initialPath: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/login" element={<h1>Login test</h1>} />
          <Route path="/forgot-password" element={<h1>Forgot test</h1>} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ResetPasswordPage', () => {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    server.use(authMeGuestHandler);
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('sans token : affiche écran lien invalide', () => {
    renderReset('/reset');
    expect(screen.getByRole('heading', { name: /lien invalide/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /aller à la connexion/i })).toBeInTheDocument();
  });

  it('avec token : affiche le formulaire 2 mots de passe', () => {
    renderReset('/reset?token=abc');
    expect(screen.getByRole('heading', { name: /nouveau mot de passe/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nouveau mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirme le mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mettre à jour/i })).toBeInTheDocument();
  });

  it('mots de passe différents : affiche erreur "doivent être identiques"', async () => {
    const user = userEvent.setup();
    renderReset('/reset?token=abc');
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'abcd1234');
    await user.type(screen.getByLabelText(/confirme le mot de passe/i), 'differen');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/doivent être identiques/i);
    });
  });

  it('soumission OK : appelle API avec token + newPassword + affiche succès', async () => {
    const user = userEvent.setup();
    let captured: { token?: string; newPassword?: string } | null = null;
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, async ({ request }) => {
        captured = (await request.json()) as { token: string; newPassword: string };
        return HttpResponse.json({ message: 'Mot de passe réinitialisé.' });
      })
    );
    renderReset('/reset?token=plainTokenABC');
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'newpass1A');
    await user.type(screen.getByLabelText(/confirme le mot de passe/i), 'newpass1A');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));
    await waitFor(() => {
      expect(captured?.token).toBe('plainTokenABC');
      expect(captured?.newPassword).toBe('newpass1A');
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /mot de passe mis à jour/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /aller à la connexion/i })).toBeInTheDocument();
  });

  it('API renvoie 400 (token invalide) : affiche écran lien invalide', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, () =>
        HttpResponse.json({ error: 'Token invalide ou expiré.' }, { status: 400 })
      )
    );
    renderReset('/reset?token=expired');
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'newpass1A');
    await user.type(screen.getByLabelText(/confirme le mot de passe/i), 'newpass1A');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /lien invalide/i })).toBeInTheDocument();
    });
  });

  it('API renvoie 500 (erreur serveur) : affiche fallback erreur, formulaire reste', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, () =>
        HttpResponse.json({ error: 'oops' }, { status: 500 })
      )
    );
    renderReset('/reset?token=abc');
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'newpass1A');
    await user.type(screen.getByLabelText(/confirme le mot de passe/i), 'newpass1A');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: /lien invalide/i })).not.toBeInTheDocument();
  });
});
