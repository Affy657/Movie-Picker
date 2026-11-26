import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import VerifyEmailPage from '@/features/auth/pages/VerifyEmailPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { buildUserProfile } from '@/test-utils/userProfile';
import { TEST_API_V1, authMeGuestHandler } from '@/mocks/handlers';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { clearSessionHint, setSessionHint } from '@/features/auth/session-hint';

const CONFIRM_URL = `${TEST_API_V1}/auth/email-verification/confirm`;

function LocationSearch() {
  return <output data-testid="location-search">{useLocation().search}</output>;
}

function renderVerify(initialPath: string) {
  return render(
    <StrictMode>
      <AppTestProviders>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
          <LocationSearch />
        </MemoryRouter>
      </AppTestProviders>
    </StrictMode>
  );
}

describe('VerifyEmailPage', () => {
  const server = setupServer();
  let confirmations: unknown[] = [];

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    confirmations = [];
    server.use(
      authMeGuestHandler,
      http.post(CONFIRM_URL, async ({ request }) => {
        confirmations.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      })
    );
  });
  afterEach(() => {
    server.resetHandlers();
    clearSessionHint();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('confirms the address once with the token of the link, then hides the token from the address bar', async () => {
    renderVerify('/verify-email?token=tokenFromTheEmail');

    expect(await screen.findByRole('heading', { name: /adresse confirmée/i })).toBeInTheDocument();
    expect(confirmations).toEqual([{ token: 'tokenFromTheEmail' }]);
    expect(screen.getByTestId('location-search')).toHaveTextContent('');
  });

  it('offers to sign in to a visitor whose address is now confirmed', async () => {
    renderVerify('/verify-email?token=tokenFromTheEmail');

    await screen.findByRole('heading', { name: /adresse confirmée/i });
    expect(screen.getByRole('link', { name: /aller à la connexion/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('refreshes the account of a signed-in member so the reminder goes away', async () => {
    setSessionHint();
    let confirmed = false;
    let readsOnceConfirmed = 0;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => {
        if (confirmed) readsOnceConfirmed += 1;
        return apiJson<'UserProfileResponse'>(
          buildUserProfile({ emailVerifiedAt: confirmed ? '2026-11-25T09:00:00Z' : null })
        );
      }),
      http.post(CONFIRM_URL, () => {
        confirmed = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderVerify('/verify-email?token=tokenFromTheEmail');

    await screen.findByRole('heading', { name: /adresse confirmée/i });
    await waitFor(() => expect(readsOnceConfirmed).toBeGreaterThan(0));
    expect(screen.getByRole('link', { name: /aller à l’accueil/i })).toHaveAttribute('href', '/');
  });

  it('explains that an expired link no longer works and where to ask for a new one', async () => {
    server.use(http.post(CONFIRM_URL, () => apiErrorJson(400, 'invalid_email_verification_token')));

    renderVerify('/verify-email?token=expired');

    expect(
      await screen.findByRole('heading', { name: /lien invalide ou expiré/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/compte et sécurité/i)).toBeInTheDocument();
  });

  it('says the link is incomplete when it carries no token, without calling the server', () => {
    renderVerify('/verify-email');

    expect(screen.getByRole('heading', { name: /lien invalide ou expiré/i })).toBeInTheDocument();
    expect(screen.getByText(/ce lien est incomplet/i)).toBeInTheDocument();
    expect(confirmations).toEqual([]);
  });

  it('lets the member try again when the server could not be reached', async () => {
    let attempts = 0;
    server.use(
      http.post(CONFIRM_URL, () => {
        attempts += 1;
        return attempts === 1
          ? apiErrorJson(503, 'service_unavailable')
          : new HttpResponse(null, { status: 204 });
      })
    );
    const user = userEvent.setup();

    renderVerify('/verify-email?token=tokenFromTheEmail');
    await user.click(await screen.findByRole('button', { name: /réessayer/i }));

    expect(await screen.findByRole('heading', { name: /adresse confirmée/i })).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it('keeps focus on the page heading while trying again, and announces the outcome where the page describes it', async () => {
    let attempts = 0;
    server.use(
      http.post(CONFIRM_URL, () => {
        attempts += 1;
        return attempts === 1
          ? apiErrorJson(503, 'service_unavailable')
          : new HttpResponse(null, { status: 204 });
      })
    );
    const user = userEvent.setup();

    renderVerify('/verify-email?token=tokenFromTheEmail');
    const retry = await screen.findByRole('button', { name: /réessayer/i });
    const description = screen.getByText(/la confirmation n’a pas abouti/i);
    expect(description).toHaveAttribute('aria-live', 'polite');

    await user.click(retry);

    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    await screen.findByRole('heading', { name: /adresse confirmée/i });
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(description).toHaveTextContent('Merci, votre adresse e-mail est confirmée.');
  });
});
