import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/features/auth/pages/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { setSessionHint } from '@/features/auth/session-hint';

const ME = {
  userId: 'u-index',
  displayName: 'Idx',
  emailMasked: 'i***@test.local',
  uiTheme: 'light',
  accentColor: 'default',
  handle: 'idx',
  bio: null,
  isProfilePublic: true,
  avatarId: 'alpha',
  letterboxdPendingReconciliationCount: 2,
};

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function renderAccount() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('AccountIndexPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME)));
  });
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('redirige vers la rubrique Profil sur ordinateur', async () => {
    stubMatchMedia(false);

    renderAccount();

    expect(await screen.findByRole('heading', { name: 'Profil' })).toBeInTheDocument();
  });

  it('affiche un index de rubriques sur mobile', async () => {
    stubMatchMedia(true);

    renderAccount();

    expect(await screen.findByText('Idx')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Profil/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /préférences/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /intégrations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /compte et sécurité/i })).toBeInTheDocument();
    expect(screen.getByText(', action requise')).toBeInTheDocument();
  });
});
