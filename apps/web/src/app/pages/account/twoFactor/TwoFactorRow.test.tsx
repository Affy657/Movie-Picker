import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
import { stubMatchMedia } from '@/test-utils/matchMedia';

const CODES = [
  '4F7K-9QMB',
  'T2XH-81PD',
  'MZ6R-4KCW',
  '8QJN-V3TA',
  'RH5E-27LY',
  'W9PC-6DGU',
  '3KVB-XM8S',
  'N7TF-Q2EJ',
  'C4YL-H9RZ',
  '6DUA-PW3K',
];

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

describe('TwoFactorRow', () => {
  const server = setupServer();
  let enabled = false;
  let remaining = 0;
  let hasPassword = true;

  function serveProfile() {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        apiJson<'UserProfileResponse'>(
          buildUserProfile({
            twoFactorEnabled: enabled,
            backupCodesRemaining: remaining,
            hasPassword,
          })
        )
      ),
      http.post(`${TEST_API_V1}/auth/me/two-factor/setup`, () =>
        apiJson<'TwoFactorSetupResponse'>({
          manualKey: 'JBSWY3DPEHPK3PXP',
          otpauthUri: 'otpauth://totp/Movie%20Picker:lea%40test.local?secret=JBSWY3DPEHPK3PXP',
          setupToken: 'sealed-token',
        })
      )
    );
  }

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    enabled = false;
    remaining = 0;
    hasPassword = true;
    localStorage.setItem('moviepicker-locale', 'fr');
    setSessionHint();
    stubMatchMedia(false);
    serveProfile();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    server.resetHandlers();
    clearSessionHint();
    localStorage.clear();
  });
  afterAll(() => server.close());

  async function openSetup(user: ReturnType<typeof userEvent.setup>) {
    renderSecurity();
    await screen.findByText('Désactivée');
    await user.click(screen.getByRole('button', { name: 'Activer' }));
    return screen.findByRole('dialog', { name: 'Activer la double authentification' });
  }

  it('turns it on in three steps and shows the backup codes once', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    server.use(
      http.post(`${TEST_API_V1}/auth/me/two-factor`, async ({ request }) => {
        sent = await request.json();
        enabled = true;
        remaining = 10;
        return apiJson<'TwoFactorBackupCodesResponse'>({ backupCodes: CODES });
      })
    );

    const dialog = await openSetup(user);

    expect(await within(dialog).findByText('Étape 1 sur 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: /QR code/ })).toBeInTheDocument();
    expect(within(dialog).getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Continuer' }));

    expect(within(dialog).getByText('Étape 2 sur 3')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Code affiché par l’application'), '123456');
    await user.type(within(dialog).getByLabelText('Mot de passe actuel'), 'abcd1234');
    await user.click(within(dialog).getByRole('button', { name: 'Activer' }));

    expect(await within(dialog).findByText('Gardez vos codes de secours')).toBeInTheDocument();
    expect(sent).toEqual({
      setupToken: 'sealed-token',
      code: '123456',
      currentPassword: 'abcd1234',
    });
    for (const code of CODES) expect(within(dialog).getByText(code)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'J’ai rangé mes codes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Activée')).toBeInTheDocument();
    expect(screen.getByText(/10 codes de secours restants/)).toBeInTheDocument();
  });

  it('explains the clock of the phone when the first code does not match', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/me/two-factor`, () =>
        apiErrorJson(400, 'two_factor_code_invalid')
      )
    );

    const dialog = await openSetup(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Continuer' }));
    await user.type(within(dialog).getByLabelText('Code affiché par l’application'), '000000');
    await user.type(within(dialog).getByLabelText('Mot de passe actuel'), 'abcd1234');
    await user.click(within(dialog).getByRole('button', { name: 'Activer' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/heure automatique/);
    expect(within(dialog).getByText('Étape 2 sur 3')).toBeInTheDocument();
  });

  it('asks no password from an account that signs in with Google or GitHub', async () => {
    const user = userEvent.setup();
    hasPassword = false;

    const dialog = await openSetup(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Continuer' }));

    expect(within(dialog).getByLabelText('Code affiché par l’application')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument();
  });

  it('opens the authenticator app from a phone instead of a QR code', async () => {
    const user = userEvent.setup();
    stubMatchMedia(true);

    const dialog = await openSetup(user);

    const openApp = await within(dialog).findByRole('link', {
      name: 'Ouvrir l’application d’authentification',
    });
    expect(openApp).toHaveAttribute('href', expect.stringMatching(/^otpauth:\/\/totp\//));
    expect(within(dialog).queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'J’ai ajouté la clé' })).toBeInTheDocument();
  });

  it('turns it off with a code', async () => {
    const user = userEvent.setup();
    enabled = true;
    remaining = 10;
    let sent: unknown;
    server.use(
      http.delete(`${TEST_API_V1}/auth/me/two-factor`, async ({ request }) => {
        sent = await request.json();
        enabled = false;
        remaining = 0;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderSecurity();
    await user.click(await screen.findByRole('button', { name: 'Désactiver' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Désactiver la double authentification',
    });
    await user.type(
      within(dialog).getByLabelText('Code de l’application ou code de secours'),
      '4F7K-9QMB'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Désactiver' }));

    expect(await screen.findByText('Désactivée')).toBeInTheDocument();
    expect(sent).toEqual({ code: '4F7K-9QMB' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('replaces the backup codes and shows the new ones', async () => {
    const user = userEvent.setup();
    enabled = true;
    remaining = 2;
    server.use(
      http.post(`${TEST_API_V1}/auth/me/two-factor/backup-codes`, () => {
        remaining = 10;
        return apiJson<'TwoFactorBackupCodesResponse'>({ backupCodes: CODES });
      })
    );

    renderSecurity();
    expect(
      await screen.findByText(/Créez de nouveaux codes de secours avant d’en manquer/)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nouveaux codes de secours' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nouveaux codes de secours' });
    await user.type(within(dialog).getByLabelText('Code affiché par l’application'), '123456');
    await user.click(within(dialog).getByRole('button', { name: 'Générer les codes' }));

    expect(await within(dialog).findByText(CODES[0]!)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'J’ai rangé mes codes' }));
    expect(await screen.findByText(/10 codes de secours restants/)).toBeInTheDocument();
  });
});
