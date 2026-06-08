import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import LandingPage from '@/app/pages/LandingPage';
import CreateEvent from '@/features/events/pages/CreateEvent';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import AccountPage from '@/features/auth/pages/AccountPage';
import MyEventsPage from '@/features/events/pages/MyEventsPage';

const AUTH_USER = {
  userId: 'u-a11y',
  displayName: 'TestUser',
  emailMasked: 't***@test.local',
  uiTheme: 'light',
  accentColor: 'default',
};

describe('accessibilité (axe)', () => {
  const server = setupServer(authMeGuestHandler);

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  function renderPage(ui: React.ReactElement) {
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </AppTestProviders>
    );
    return { container, queryClient };
  }

  async function assertNoViolations(
    container: HTMLElement,
    queryClient: ReturnType<typeof createTestQueryClient>
  ) {
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    const results = await axe(container);
    expect(
      results.violations,
      results.violations.map((v) => v.description).join('\n')
    ).toHaveLength(0);
  }

  it("LandingPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<LandingPage />);
    await assertNoViolations(container, queryClient);
  });

  it("CreateEvent n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<CreateEvent />);
    await assertNoViolations(container, queryClient);
  });

  it("LoginPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<LoginPage />);
    await assertNoViolations(container, queryClient);
  });

  it("RegisterPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<RegisterPage />);
    await assertNoViolations(container, queryClient);
  });

  it("ForgotPasswordPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<ForgotPasswordPage />);
    await assertNoViolations(container, queryClient);
  });

  it("AccountPage (visiteur) n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<AccountPage />);
    await assertNoViolations(container, queryClient);
  });

  it("MyEventsPage n'a pas de violations", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(AUTH_USER)),
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [], total: 0 }))
    );
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter initialEntries={['/my-events']}>
          <Routes>
            <Route path="/my-events" element={<MyEventsPage />} />
            <Route path="/login" element={<div />} />
            <Route path="/new" element={<div />} />
          </Routes>
        </MemoryRouter>
      </AppTestProviders>
    );
    await assertNoViolations(container, queryClient);
  });
});
