import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { AppRoutesWithErrorBoundary } from '@/app/App';
import { ROUTE_CHUNKS } from '@/app/routeChunks';
import { ROUTES } from '@/app/routes';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';

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

const letterboxdMemberHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
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
    letterboxdUsername: 'pat-on-letterboxd',
    letterboxdLastSyncAt: null,
    letterboxdLastSyncError: null,
  })
);

describe('App shell across navigations', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());

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
});
