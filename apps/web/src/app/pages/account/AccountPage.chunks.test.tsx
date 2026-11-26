import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiJson } from '@/mocks/apiJson';
import { buildUserProfile } from '@/test-utils/userProfile';
import AccountPage from '@/app/pages/account/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

const loaded = vi.hoisted(() => ({ accountSections: 0 }));

vi.mock('@/app/pages/account/AccountSettingsRoutes', async (importOriginal) => {
  loaded.accountSections += 1;
  return importOriginal();
});

function renderAccount(initialPath: string) {
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

describe('AccountPage chunks', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('shows a visitor without a session the device preferences without loading the account sections', async () => {
    localStorage.setItem('moviepicker-locale', 'fr');
    localStorage.removeItem('mp.session-hint');

    renderAccount('/settings');

    expect(await screen.findByRole('heading', { name: 'Paramètres' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Préférences' })).toBeInTheDocument();
    expect(loaded.accountSections).toBe(0);
  });

  it('loads the account sections once the session holds a member', async () => {
    localStorage.setItem('moviepicker-locale', 'fr');
    localStorage.setItem('mp.session-hint', '1');
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        apiJson<'UserProfileResponse'>(buildUserProfile({ userId: 'u-acc', displayName: 'Pat' }))
      )
    );

    renderAccount('/settings/preferences');

    expect(await screen.findByRole('heading', { name: 'Préférences' })).toBeInTheDocument();
    expect(loaded.accountSections).toBe(1);
  });
});
