import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1, authMeGuestHandler } from '@/mocks/handlers';

function LocationSearch() {
  return <output data-testid="location-search">{useLocation().search}</output>;
}

function renderReset(initialPath: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/login" element={<h1>Login test</h1>} />
          <Route path="/forgot-password" element={<h1>Forgot test</h1>} />
        </Routes>
        <LocationSearch />
      </MemoryRouter>
    </AppTestProviders>
  );
}

async function submitNewPassword(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'newpass1A');
  await user.type(screen.getByLabelText(/confirme le mot de passe/i), 'newpass1A');
  await user.click(screen.getByRole('button', { name: /mettre à jour/i }));
}

describe('ResetPasswordPage', () => {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    server.use(authMeGuestHandler);
  });
  afterEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  it('without token: shows the invalid link screen and a CTA to request a new link', () => {
    renderReset('/reset');
    expect(screen.getByRole('heading', { name: /lien invalide/i })).toBeInTheDocument();
    const requestLink = screen.getByRole('link', { name: /demander un nouveau lien/i });
    expect(requestLink).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: /aller à la connexion/i })).toBeInTheDocument();
  });

  it('avec token : affiche le formulaire 2 mots de passe', () => {
    renderReset('/reset?token=abc');
    expect(screen.getByRole('heading', { name: /nouveau mot de passe/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nouveau mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirme le mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mettre à jour/i })).toBeInTheDocument();
  });

  it('different passwords: shows the "must match" error', async () => {
    const user = userEvent.setup();
    renderReset('/reset?token=abc');
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'abcd1234');
    await user.type(screen.getByLabelText(/confirme le mot de passe/i), 'differen');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/doivent être identiques/i);
    });
  });

  it('successful submission: calls the API with token and newPassword and shows success', async () => {
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

  it('takes the token out of the address bar as soon as the page opens, and still submits it', async () => {
    const user = userEvent.setup();
    let captured: { token?: string } | null = null;
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, async ({ request }) => {
        captured = (await request.json()) as { token: string };
        return HttpResponse.json({ message: 'Mot de passe réinitialisé.' });
      })
    );
    renderReset('/reset?token=plainTokenABC&lang=fr');
    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toBe('?lang=fr');
    });
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'newpass1A');
    await user.type(screen.getByLabelText(/confirme le mot de passe/i), 'newpass1A');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));
    await waitFor(() => {
      expect(captured?.token).toBe('plainTokenABC');
    });
  });

  it('API returns 400 (invalid token): shows the invalid link screen', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, () =>
        HttpResponse.json(
          { error: 'Invalid or expired token', reason: 'invalid_reset_token' },
          { status: 400 }
        )
      )
    );
    renderReset('/reset?token=expired');
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'newpass1A');
    await user.type(screen.getByLabelText(/confirme le mot de passe/i), 'newpass1A');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /lien invalide/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /demander un nouveau lien/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
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

  it('still knows the token after a reload, once it left the address bar', async () => {
    const user = userEvent.setup();
    let captured: { token?: string } | null = null;
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, async ({ request }) => {
        captured = (await request.json()) as { token: string };
        return HttpResponse.json({ message: 'Mot de passe réinitialisé.' });
      })
    );
    const firstVisit = renderReset('/reset?token=plainTokenABC');
    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toBe('');
    });
    firstVisit.unmount();

    renderReset('/reset');
    expect(screen.getByRole('heading', { name: /nouveau mot de passe/i })).toBeInTheDocument();
    await submitNewPassword(user);
    await waitFor(() => {
      expect(captured?.token).toBe('plainTokenABC');
    });
  });

  it('forgets the token once the password is reset', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, () =>
        HttpResponse.json({ message: 'Mot de passe réinitialisé.' })
      )
    );
    const firstVisit = renderReset('/reset?token=plainTokenABC');
    await submitNewPassword(user);
    expect(
      await screen.findByRole('heading', { name: /mot de passe mis à jour/i })
    ).toBeInTheDocument();
    firstVisit.unmount();

    renderReset('/reset');
    expect(screen.getByRole('heading', { name: /lien invalide/i })).toBeInTheDocument();
  });

  it('forgets the token the API reports as invalid or expired', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, () =>
        HttpResponse.json(
          { error: 'Invalid or expired token', reason: 'invalid_reset_token' },
          { status: 400 }
        )
      )
    );
    const firstVisit = renderReset('/reset?token=expired');
    await submitNewPassword(user);
    expect(await screen.findByRole('heading', { name: /lien invalide/i })).toBeInTheDocument();
    firstVisit.unmount();

    renderReset('/reset');
    expect(screen.getByRole('heading', { name: /lien invalide/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/nouveau mot de passe/i)).not.toBeInTheDocument();
  });

  it('still resets the password when the browser storage is unavailable', async () => {
    const user = userEvent.setup();
    let captured: { token?: string } | null = null;
    server.use(
      http.post(`${TEST_API_V1}/auth/password-reset/confirm`, async ({ request }) => {
        captured = (await request.json()) as { token: string };
        return HttpResponse.json({ message: 'Mot de passe réinitialisé.' });
      })
    );
    const blocked = (): never => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    };
    const storageSpies = [
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked),
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked),
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked),
    ];
    try {
      renderReset('/reset?token=plainTokenABC');
      await submitNewPassword(user);
      await waitFor(() => {
        expect(captured?.token).toBe('plainTokenABC');
      });
      expect(
        await screen.findByRole('heading', { name: /mot de passe mis à jour/i })
      ).toBeInTheDocument();
    } finally {
      for (const spy of storageSpies) spy.mockRestore();
    }
  });
});
