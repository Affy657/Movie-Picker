import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { AppRoutesWithErrorBoundary } from '@/app/App';
import { ROUTE_CHUNKS } from '@/app/routeChunks';
import { ROUTES } from '@/app/routes';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { MOVED_ORIGIN_NOTICE_KEY } from '@/shared/pwa/movedOrigin';

type StubbedChunk = 'donate' | 'tech' | 'legalNotice' | 'privacyPolicy';

function pageModule(heading: string) {
  return { default: () => <h1>{heading}</h1> } as never;
}

function stubPage(chunk: StubbedChunk, heading: string) {
  vi.spyOn(ROUTE_CHUNKS, chunk).mockResolvedValue(pageModule(heading));
}

let navigateTo: NavigateFunction;

function NavigationProbe() {
  navigateTo = useNavigate();
  return null;
}

function renderApp(path: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutesWithErrorBoundary />
        <NavigationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function settle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function memberHandler(letterboxdUsername: string | null) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
      userId: 'u-shell',
      displayName: 'Pat',
      emailMasked: 'p***@test.local',
      uiTheme: 'light',
      accentColor: 'default',
      ratingScale: 'five',
      avatarId: 'alpha',
      handle: 'pat',
      bio: null,
      isProfilePublic: true,
      letterboxdUsername,
      letterboxdLastSyncAt: null,
      letterboxdLastSyncError: null,
    })
  );
}

const letterboxdMemberHandler = memberHandler('pat-on-letterboxd');

function openDialogMatching(title: RegExp): Promise<HTMLDialogElement> {
  return waitFor(() => {
    const dialog = [...document.querySelectorAll('dialog[open]')].find((candidate) =>
      title.test(candidate.textContent ?? '')
    );
    expect(dialog).toBeDefined();
    return dialog as HTMLDialogElement;
  });
}

async function openAccountMenuEntry(user: UserEvent, entry: RegExp): Promise<void> {
  await user.click(screen.getByRole('button', { name: /menu du compte/i }));
  await user.click(screen.getByRole('menuitem', { name: entry }));
}

const SHELL_DIALOGS: ReadonlyArray<
  [string, 'guest' | 'member', (user: UserEvent) => Promise<void>, RegExp, (() => void)?]
> = [
  [
    'the cookie settings of the footer',
    'guest',
    (user) => user.click(screen.getByRole('button', { name: 'Gérer les cookies' })),
    /gestion des cookies/i,
  ],
  [
    'the cookie settings of the banner',
    'guest',
    (user) => user.click(screen.getByRole('button', { name: 'Personnaliser' })),
    /gestion des cookies/i,
  ],
  [
    'the problem report of the footer',
    'guest',
    (user) => user.click(screen.getByRole('button', { name: 'Signaler un problème' })),
    /signaler un problème/i,
  ],
  [
    'the install guide of the footer',
    'guest',
    (user) => user.click(screen.getByRole('button', { name: /installer l['’]app/i })),
    /installer movie picker/i,
  ],
  [
    'the install guide of the moved address notice',
    'guest',
    (user) =>
      user.click(
        within(screen.getByRole('region', { name: /a changé d['’]adresse/i })).getByRole('button', {
          name: /installer l['’]app/i,
        })
      ),
    /installer movie picker/i,
    () => localStorage.setItem(MOVED_ORIGIN_NOTICE_KEY, 'pending'),
  ],
  [
    'the idea form of the footer',
    'member',
    (user) => user.click(screen.getByRole('button', { name: 'Proposer une idée' })),
    /proposer une idée/i,
  ],
  [
    'the feedback form of the account menu',
    'member',
    (user) => openAccountMenuEntry(user, /envoyer un retour/i),
    /envoyer un retour/i,
  ],
  [
    'the install guide of the account menu',
    'member',
    (user) => openAccountMenuEntry(user, /installer l['’]app/i),
    /installer movie picker/i,
  ],
];

describe('App shell across navigations', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());
  beforeEach(() => {
    localStorage.removeItem('moviepicker-consent');
    localStorage.removeItem(MOVED_ORIGIN_NOTICE_KEY);
  });

  it('keeps the shell mounted from page to page, so the Letterboxd sync runs once per visit', async () => {
    let syncCalls = 0;
    server.use(
      letterboxdMemberHandler,
      http.post(`${TEST_API_V1}/letterboxd/sync`, () => {
        syncCalls++;
        return HttpResponse.json({ skipped: true });
      })
    );
    stubPage('donate', 'Soutenir');
    stubPage('tech', 'Coulisses');
    stubPage('legalNotice', 'Mentions');
    stubPage('privacyPolicy', 'Confidentialité');
    renderApp(ROUTES.donate);
    await screen.findByRole('heading', { name: 'Soutenir' }, { timeout: 20000 });
    await waitFor(() => expect(syncCalls).toBe(1));

    for (const [path, heading] of [
      [ROUTES.tech, 'Coulisses'],
      [ROUTES.legalNotice, 'Mentions'],
      [ROUTES.privacyPolicy, 'Confidentialité'],
    ] as const) {
      act(() => {
        void navigateTo(path);
      });
      await screen.findByRole('heading', { name: heading });
    }
    await settle(100);

    expect(syncCalls).toBe(1);
  });

  it('keeps the header on screen while the next page is still loading', async () => {
    server.use(authMeGuestHandler);
    stubPage('donate', 'Soutenir');
    let resolveReleaseNotes!: (module: unknown) => void;
    vi.spyOn(ROUTE_CHUNKS, 'releaseNotes').mockReturnValue(
      new Promise((resolve) => {
        resolveReleaseNotes = resolve;
      }) as never
    );
    renderApp(ROUTES.donate);
    await screen.findByRole('heading', { name: 'Soutenir' }, { timeout: 20000 });

    act(() => {
      void navigateTo(ROUTES.releaseNotes);
    });

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Soutenir' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('status')).toBeInTheDocument();

    await act(async () => resolveReleaseNotes(pageModule('Nouveautés')));

    expect(await screen.findByRole('heading', { name: 'Nouveautés' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it.each(SHELL_DIALOGS)(
    'closes %s when the page changes, as the remount of the whole app did',
    async (_dialog, visitor, open, title, prepare) => {
      prepare?.();
      server.use(visitor === 'member' ? memberHandler(null) : authMeGuestHandler);
      stubPage('donate', 'Soutenir');
      stubPage('tech', 'Coulisses');
      const user = userEvent.setup();
      renderApp(ROUTES.donate);
      await screen.findByRole('heading', { name: 'Soutenir' }, { timeout: 20000 });
      if (visitor === 'member') {
        await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 20000 });
      }

      await open(user);
      const dialog = await openDialogMatching(title);
      act(() => {
        void navigateTo(ROUTES.tech);
      });
      await screen.findByRole('heading', { name: 'Coulisses' });

      await waitFor(() => expect(dialog.isConnected && dialog.hasAttribute('open')).toBe(false));
    }
  );
});
