import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
import type { ActiveSession } from '@/features/auth/types';

const SESSIONS_URL = `${TEST_API_V1}/users/me/sessions`;

const THIS_DEVICE: ActiveSession = {
  id: 'current',
  browser: 'Chrome',
  operatingSystem: 'Windows',
  deviceKind: 'desktop',
  signedInAt: '2026-11-24T09:00:00Z',
  lastActiveAt: '2026-11-27T11:59:00Z',
  current: true,
};

const PHONE: ActiveSession = {
  id: 'phone',
  browser: 'Safari',
  operatingSystem: 'iOS',
  deviceKind: 'phone',
  signedInAt: '2026-11-03T09:00:00Z',
  lastActiveAt: '2026-11-27T10:00:00Z',
  current: false,
};

const LEGACY: ActiveSession = {
  id: 'legacy',
  browser: null,
  operatingSystem: null,
  deviceKind: 'unknown',
  signedInAt: '2026-09-02T09:00:00Z',
  lastActiveAt: null,
  current: false,
};

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

const signedIn = http.get(`${TEST_API_V1}/auth/me`, () =>
  apiJson<'UserProfileResponse'>(buildUserProfile({ emailVerifiedAt: '2026-11-25T09:00:00Z' }))
);

function listing(...items: ActiveSession[]) {
  return http.get(SESSIONS_URL, () => apiJson<'ActiveSessionListResponse'>({ items }));
}

async function devicesCard() {
  const title = await screen.findByText('Appareils connectés');
  const card = title.closest('section');
  if (!card) throw new Error('devices card not found');
  return card;
}

describe('Active sessions in Compte et sécurité', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-27T12:00:00Z'));
    localStorage.setItem('moviepicker-locale', 'fr');
    setSessionHint();
    stubDesktop();
  });
  afterEach(() => {
    vi.useRealTimers();
    server.resetHandlers();
    clearSessionHint();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('lists this device first, then the others with their last activity', async () => {
    server.use(signedIn, listing(THIS_DEVICE, PHONE, LEGACY));

    renderSecurity();
    const card = await devicesCard();

    expect(await within(card).findByText('Chrome sur Windows')).toBeInTheDocument();
    expect(within(card).getByText('Cet appareil')).toBeInTheDocument();
    expect(within(card).getByText('Actif maintenant')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
    expect(within(card).getByText('Safari sur iOS')).toBeInTheDocument();
    expect(
      within(card).getByText('Actif il y a 2 heures, connecté le 3 nov. 2026')
    ).toBeInTheDocument();
    expect(within(card).getByText('Appareil non identifié')).toBeInTheDocument();
    expect(within(card).getByText('Connecté le 2 sept. 2026')).toBeInTheDocument();
  });

  it('signs another device out once I confirm, and says so', async () => {
    let revoked: string | undefined;
    server.use(
      signedIn,
      listing(THIS_DEVICE, PHONE),
      http.delete(`${SESSIONS_URL}/:id`, ({ params }) => {
        revoked = String(params.id);
        return new HttpResponse(null, { status: 204 });
      })
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderSecurity();
    const card = await devicesCard();
    await user.click(
      await within(card).findByRole('button', { name: 'Déconnecter Safari sur iOS' })
    );
    expect(revoked).toBeUndefined();
    server.use(listing(THIS_DEVICE));
    await user.click(within(card).getByRole('button', { name: 'Confirmer' }));

    expect(await within(card).findByText('Safari sur iOS est déconnecté.')).toBeInTheDocument();
    expect(revoked).toBe('phone');
    expect(within(card).queryByRole('button', { name: /Safari sur iOS/ })).not.toBeInTheDocument();
  });

  it('keeps the device when I cancel', async () => {
    server.use(signedIn, listing(THIS_DEVICE, PHONE));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderSecurity();
    const card = await devicesCard();
    await user.click(
      await within(card).findByRole('button', { name: 'Déconnecter Safari sur iOS' })
    );
    await user.click(within(card).getByRole('button', { name: 'Annuler' }));

    expect(
      within(card).getByRole('button', { name: 'Déconnecter Safari sur iOS' })
    ).toBeInTheDocument();
  });

  it('says so when a device could not be signed out', async () => {
    server.use(
      signedIn,
      listing(THIS_DEVICE, PHONE),
      http.delete(`${SESSIONS_URL}/:id`, () => apiErrorJson(503, 'service_unavailable'))
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderSecurity();
    const card = await devicesCard();
    await user.click(
      await within(card).findByRole('button', { name: 'Déconnecter Safari sur iOS' })
    );
    await user.click(within(card).getByRole('button', { name: 'Confirmer' }));

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Safari sur iOS n’a pas pu être déconnecté.'
    );
  });

  it('signs every other device out at once', async () => {
    let revokedOthers = false;
    server.use(
      signedIn,
      listing(THIS_DEVICE, PHONE, LEGACY),
      http.delete(`${SESSIONS_URL}/others`, () => {
        revokedOthers = true;
        return new HttpResponse(null, { status: 204 });
      })
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderSecurity();
    const card = await devicesCard();
    await user.click(
      await within(card).findByRole('button', { name: 'Déconnecter les autres appareils' })
    );
    expect(
      within(card).getByText(
        'Déconnecter les 2 autres appareils ? Vous restez connecté sur celui-ci.'
      )
    ).toBeInTheDocument();
    server.use(listing(THIS_DEVICE));
    await user.click(within(card).getByRole('button', { name: 'Confirmer' }));

    expect(
      await within(card).findByText('Les autres appareils sont déconnectés.')
    ).toBeInTheDocument();
    expect(revokedOthers).toBe(true);
    expect(
      within(card).getByText('Aucun autre appareil n’est connecté à votre compte.')
    ).toBeInTheDocument();
  });

  it('says no other device is signed in, without the button to sign them out', async () => {
    server.use(signedIn, listing(THIS_DEVICE));

    renderSecurity();
    const card = await devicesCard();

    expect(
      await within(card).findByText('Aucun autre appareil n’est connecté à votre compte.')
    ).toBeInTheDocument();
    expect(
      within(card).queryByRole('button', { name: 'Déconnecter les autres appareils' })
    ).not.toBeInTheDocument();
  });

  it('keeps the way to log out when this device is missing from the list', async () => {
    server.use(signedIn, listing(PHONE));

    renderSecurity();
    const card = await devicesCard();

    expect(await within(card).findByText('Safari sur iOS')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
  });

  it('offers a retry when the list does not load, and keeps the way to log out', async () => {
    server.use(
      signedIn,
      http.get(SESSIONS_URL, () => apiErrorJson(503, 'service_unavailable'))
    );

    renderSecurity();
    const card = await devicesCard();

    expect(
      await within(card).findByText('La liste de vos appareils n’a pas pu être chargée.')
    ).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
  });
});
