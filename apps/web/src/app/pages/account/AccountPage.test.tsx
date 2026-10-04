import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/app/pages/account/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1, authMeGuestHandler } from '@/mocks/handlers';

function renderAccount(initialPath = '/settings') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
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

  it('shows the preferences (language and theme) and sends uiTheme to the profile PATCH', async () => {
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

    renderAccount('/settings/preferences');

    expect(await screen.findByRole('heading', { name: 'Préférences' })).toBeInTheDocument();

    const darkRadio = await screen.findByRole('radio', { name: /sombre/i });
    await user.click(darkRadio);
    await waitFor(() => expect(patchedTheme).toBe('dark'));
  });

  it('shows the rating scale and sends ratingScale to the profile PATCH', async () => {
    const user = userEvent.setup();
    let patchedRatingScale: string | undefined;

    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u-acc',
          displayName: 'Pat',
          emailMasked: 'p***@test.local',
          uiTheme: 'light',
          accentColor: 'default',
          ratingScale: 'five',
        })
      ),
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as { ratingScale?: string };
        patchedRatingScale = body.ratingScale;
        return HttpResponse.json({
          userId: 'u-acc',
          displayName: 'Pat',
          emailMasked: 'p***@test.local',
          uiTheme: 'light',
          accentColor: 'default',
          ratingScale: body.ratingScale ?? 'five',
        });
      })
    );

    renderAccount('/settings/preferences');

    expect(await screen.findByRole('heading', { name: 'Préférences' })).toBeInTheDocument();

    const tenRadio = await screen.findByRole('radio', { name: 'Sur 10' });
    await user.click(tenRadio);
    await waitFor(() => expect(patchedRatingScale).toBe('ten'));
  });

  it('does not show the rating scale control for a signed-out visitor', async () => {
    server.use(authMeGuestHandler);

    renderAccount();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paramètres' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Échelle des notes')).not.toBeInTheDocument();
  });

  it('failed session check: retry screen instead of the signed-out settings', async () => {
    localStorage.setItem('mp.session-hint', '1');
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ error: 'Panne' }, { status: 503 })
      )
    );

    renderAccount();

    expect(
      await screen.findByRole('button', { name: /^réessayer$/i }, { timeout: 12000 })
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Se connecter' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l.accueil/i })).toHaveAttribute('href', '/');
  });

  it('une rubrique inconnue renvoie vers le profil sans empiler de segments', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u-acc',
          displayName: 'Pat',
          emailMasked: 'p***@test.local',
          uiTheme: 'light',
          accentColor: 'default',
        })
      )
    );

    render(
      <AppTestProviders>
        <MemoryRouter initialEntries={['/settings/account']}>
          <Routes>
            <Route path="/settings/*" element={<AccountPage />} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </AppTestProviders>
    );

    expect(await screen.findByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toBe('/settings/profil');
  });
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}
