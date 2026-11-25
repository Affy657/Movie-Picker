import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/app/pages/account/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { buildUserProfile } from '@/test-utils/userProfile';
import { TEST_API_V1 } from '@/mocks/handlers';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { clearSessionHint, setSessionHint } from '@/features/auth/session-hint';

const RESEND_URL = `${TEST_API_V1}/auth/me/email-verification`;

function stubDesktop() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderSecurity() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/settings/securite']}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

function signedInAs(emailVerifiedAt: string | null) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    apiJson<'UserProfileResponse'>(buildUserProfile({ emailVerifiedAt }))
  );
}

describe('AccountSecurityPage, address confirmation', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    setSessionHint();
    stubDesktop();
  });
  afterEach(() => {
    server.resetHandlers();
    clearSessionHint();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('reminds me that my address is not confirmed, and flags the section in the menu', async () => {
    server.use(signedInAs(null));

    renderSecurity();

    expect(await screen.findByText(/adresse non confirmée/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /compte et sécurité.*action requise/i })
    ).toBeInTheDocument();
  });

  it('sends the confirmation email again in my language and tells me where it went', async () => {
    let body: unknown;
    server.use(
      signedInAs(null),
      http.post(RESEND_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 202 });
      })
    );
    const user = userEvent.setup();

    renderSecurity();
    await user.click(await screen.findByRole('button', { name: /renvoyer le courriel/i }));

    expect(await screen.findByText(/courriel envoyé à lea@test\.local/i)).toBeInTheDocument();
    expect(body).toEqual({ locale: 'fr' });
  });

  it('says so when the email could not be sent', async () => {
    server.use(
      signedInAs(null),
      http.post(RESEND_URL, () => apiErrorJson(503, 'service_unavailable'))
    );
    const user = userEvent.setup();

    renderSecurity();
    await user.click(await screen.findByRole('button', { name: /renvoyer le courriel/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/courriel envoyé/i)).not.toBeInTheDocument();
  });

  it('shows no reminder once the address is confirmed', async () => {
    server.use(signedInAs('2026-11-25T09:00:00Z'));

    renderSecurity();

    expect(await screen.findByText('lea@test.local')).toBeInTheDocument();
    expect(screen.queryByText(/adresse non confirmée/i)).not.toBeInTheDocument();
    expect(screen.queryByText(', action requise')).not.toBeInTheDocument();
  });
});
