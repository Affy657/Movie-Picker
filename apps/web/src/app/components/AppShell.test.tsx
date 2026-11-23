import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

function renderShell(path = '/') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<p>Page</p>} />
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

  it.each(['/listes', '/listes/l1', '/watchlist'])(
    'leads to the lists and keeps them active on %s',
    async (path) => {
      server.use(authedUserHandler);
      renderShell(path);

      await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 20000 });
      const [desktopNav, mobileNav] = screen.getAllByRole('navigation', {
        name: 'Navigation principale',
      });
      const desktopLink = within(desktopNav!).getByRole('link', { name: 'Mes listes' });
      const mobileLink = within(mobileNav!).getByRole('link', { name: 'Listes' });
      for (const link of [desktopLink, mobileLink]) {
        expect(link).toHaveAttribute('href', '/listes');
        expect(link).toHaveAttribute('aria-current', 'page');
      }
    }
  );

  it('speaks to a visitor without calling the pages his own', async () => {
    server.use(authMeGuestHandler);
    renderShell('/films/tendances');

    await screen.findAllByRole('link', { name: /^se connecter$/i }, { timeout: 20000 });
    const [desktopNav, mobileNav] = screen.getAllByRole('navigation', {
      name: 'Navigation principale',
    });
    for (const nav of [desktopNav!, mobileNav!]) {
      expect(within(nav).getByRole('link', { name: 'Soirées' })).toHaveAttribute(
        'href',
        '/my-events'
      );
      expect(within(nav).getByRole('link', { name: 'Listes' })).toHaveAttribute('href', '/listes');
      expect(within(nav).queryByRole('link', { name: /^mes /i })).not.toBeInTheDocument();
    }
  });

  it('opens the same creation page from the mobile bar as from the home page', async () => {
    server.use(authMeGuestHandler);
    renderShell('/films/tendances');

    await screen.findAllByRole('link', { name: /^se connecter$/i }, { timeout: 20000 });
    const [, mobileNav] = screen.getAllByRole('navigation', { name: 'Navigation principale' });
    expect(within(mobileNav!).getByRole('link', { name: 'Créer' })).toHaveAttribute('href', '/new');
  });
});
