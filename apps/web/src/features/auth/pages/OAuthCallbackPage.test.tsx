import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import OAuthCallbackPage from '@/features/auth/pages/OAuthCallbackPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/shared/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track }) }));

function renderCallback(initialPath: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/my-events" element={<div data-testid="my-events-marker" />} />
          <Route path="/e/:slug" element={<div data-testid="night-marker" />} />
          <Route path="/" element={<div data-testid="home-marker" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('OAuthCallbackPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => localStorage.setItem('moviepicker-locale', 'fr'));
  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('pose le session hint puis redirige vers returnTo', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u-oauth',
          displayName: 'Oa',
          emailMasked: 'o***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
        })
      )
    );

    renderCallback('/auth/callback?returnTo=%2Fmy-events&provider=google&event=signup');

    await waitFor(() => {
      expect(screen.getByTestId('my-events-marker')).toBeInTheDocument();
    });
    expect(localStorage.getItem('mp.session-hint')).toBe('1');
  });

  it('sans returnTo, redirige vers la home', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({ error: '401' }, { status: 401 }))
    );

    renderCallback('/auth/callback');

    await waitFor(() => {
      expect(screen.getByTestId('home-marker')).toBeInTheDocument();
    });
  });

  it.each([
    ['signup', 'user_signed_up', '%2Fe%2Fsoiree', 'event'],
    ['login', 'user_logged_in', '%2Fmy-events', 'other'],
  ])(
    'measures a %s with its provider and where the account was heading',
    async (event, name, returnTo, origin) => {
      track.mockClear();
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({ error: '401' }, { status: 401 })
        )
      );

      renderCallback(`/auth/callback?returnTo=${returnTo}&provider=github&event=${event}`);

      await waitFor(() => expect(track).toHaveBeenCalledWith(name, { method: 'github', origin }));
    }
  );
});
