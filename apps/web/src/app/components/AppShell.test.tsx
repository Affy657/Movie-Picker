import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AppShell from '@/app/components/AppShell';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';

const { loadDialog } = vi.hoisted(() => ({ loadDialog: vi.fn(() => Promise.resolve()) }));

vi.mock(
  '@/features/events/components/create-event/createEventDialogContext',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/features/events/components/create-event/createEventDialogContext')
    >()),
    loadCreateEventDialog: loadDialog,
  })
);

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
    handle: 'alice',
    isProfilePublic: true,
  })
);

function renderShell() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<p>Page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('AppShell', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    loadDialog.mockClear();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  function runIdleCallbacksAtOnce() {
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelIdleCallback', () => undefined);
  }

  it('fetches the creation window while idle once the visitor is signed in', async () => {
    runIdleCallbacksAtOnce();
    server.use(authedUserHandler);
    renderShell();

    await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 20000 });

    expect(loadDialog).toHaveBeenCalled();
  });

  it('leaves the creation window unfetched for a visitor', async () => {
    runIdleCallbacksAtOnce();
    server.use(authMeGuestHandler);
    renderShell();

    await screen.findAllByRole('link', { name: /^se connecter$/i }, { timeout: 20000 });

    expect(loadDialog).not.toHaveBeenCalled();
  });
});
