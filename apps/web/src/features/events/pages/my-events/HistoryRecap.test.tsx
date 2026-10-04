import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import HistoryRecap from '@/features/events/pages/my-events/HistoryRecap';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1, createUserStatsHandler } from '@/mocks/handlers';

function signedInAs(isProfilePublic: boolean) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
      userId: 'u-me',
      displayName: 'Moi',
      emailMasked: 'm***@test.local',
      uiTheme: 'system',
      accentColor: 'default',
      handle: 'moi',
      isProfilePublic,
    })
  );
}

function renderRecap() {
  render(
    <AppTestProviders>
      <HistoryRecap totalFinished={4} />
    </AppTestProviders>
  );
}

describe('HistoryRecap (MSW)', () => {
  const server = setupServer();
  const statsRequests: string[] = [];

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    statsRequests.length = 0;
  });
  afterAll(() => server.close());

  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname.endsWith('/stats')) statsRequests.push(request.url);
  });

  it('shows the movies seen and the streak of a public profile', async () => {
    server.use(
      signedInAs(true),
      createUserStatsHandler('moi', { moviesSeen: 12, currentStreakWeeks: 3 })
    );
    renderRecap();

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('does not show zeros it cannot know for a private profile, whose stats answer 404', async () => {
    server.use(
      signedInAs(false),
      http.get(`${TEST_API_V1}/users/moi/stats`, () =>
        HttpResponse.json({ error: 'Profil introuvable' }, { status: 404 })
      )
    );
    renderRecap();

    expect(await screen.findByText('4')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(statsRequests).toEqual([]);
    expect(screen.queryByText(/films regardés/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/semaines d'affilée/i)).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('hides the movies seen and the streak when the statistics fail to load', async () => {
    server.use(
      signedInAs(true),
      http.get(`${TEST_API_V1}/users/moi/stats`, () =>
        HttpResponse.json({ error: 'Erreur serveur' }, { status: 500 })
      )
    );
    renderRecap();

    await screen.findByText('4');
    await expect.poll(() => statsRequests.length).toBeGreaterThan(0);
    await expect.poll(() => screen.queryByText(/films regardés/i), { timeout: 3000 }).toBeNull();
    expect(screen.queryByText(/semaines d'affilée/i)).not.toBeInTheDocument();
  });
});
