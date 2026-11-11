import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { MyEventSummary } from '@/features/events/types';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import HomeHero from './HomeHero';
import { useHomeSearchHidden } from './homeSearchVisibility';

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    handle: 'alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
  })
);

const trendingHandler = http.get(`${TEST_API_V1}/movies/showcase`, () =>
  HttpResponse.json({
    section: 'trending',
    theme: null,
    items: Array.from({ length: 4 }, (_, index) => ({
      id: 100 + index,
      mediaType: 'movie',
      title: `Tendance ${index + 1}`,
      year: '2024',
      posterPath: `https://image.tmdb.org/t/p/w500/p${index}.jpg`,
    })),
    disclaimer: '',
    tmdbAttributionUrl: '',
  })
);

function night(overrides: Partial<MyEventSummary>): MyEventSummary {
  return {
    id: overrides.slug ?? 'night',
    slug: 'night',
    title: 'Soirée',
    date: '2035-11-20',
    time: '20:30',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isCreator: false,
    isParticipant: true,
    lifecycle: 'upcoming',
    participantCount: 4,
    movieCount: 3,
    hasVoted: true,
    ...overrides,
  };
}

function eventsHandler(events: MyEventSummary[]) {
  return http.get(`${TEST_API_V1}/events/mine`, () =>
    HttpResponse.json({ events, hasMore: false, totalActive: events.length, totalFinished: 0 })
  );
}

function renderHero() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <HomeHero />
      </MemoryRouter>
    </AppTestProviders>
  );
}

async function expectCreateNightBlock() {
  expect(await screen.findByText('Vous n’arrivez pas à choisir ?')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Créer une soirée' })).toHaveAttribute('href', '/new');
  expect(screen.getByRole('link', { name: 'Comment ça marche' })).toHaveAttribute(
    'href',
    '/decouvrir'
  );
  expect(screen.queryByText('Votre prochaine soirée')).not.toBeInTheDocument();
}

describe('HomeHero', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('keeps the title, the intro and the search on the left', () => {
    server.use(authMeGuestHandler, trendingHandler);
    renderHero();

    expect(screen.getByRole('heading', { name: /on regarde ce soir/i, level: 1 })).toBeVisible();
    expect(screen.getByText(/parcourez les sélections/i)).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('visitor: offers to create a night with the wheel', async () => {
    server.use(authMeGuestHandler, trendingHandler);
    renderHero();

    await expectCreateNightBlock();
    expect(screen.getByText(/chacun propose un film, tout le monde vote/i)).toBeInTheDocument();
  });

  it('signed in without a night ahead: the same create block', async () => {
    server.use(authedUserHandler, trendingHandler, eventsHandler([]));
    renderHero();

    await expectCreateNightBlock();
  });

  it('signed in with a pending night only: the create block', async () => {
    server.use(
      authedUserHandler,
      trendingHandler,
      eventsHandler([night({ slug: 'stuck', title: 'En suspens', lifecycle: 'pending' })])
    );
    renderHero();

    await expectCreateNightBlock();
    expect(screen.queryByText('En suspens')).not.toBeInTheDocument();
  });

  it('signed in when the nights fail to load: the create block, no error', async () => {
    server.use(
      authedUserHandler,
      trendingHandler,
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({}, { status: 500 }))
    );
    renderHero();

    await expectCreateNightBlock();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('signed in with nights ahead: the nearest one, its links and Créer une autre soirée', async () => {
    server.use(
      authedUserHandler,
      trendingHandler,
      eventsHandler([
        night({ slug: 'plus-tard', title: 'Plus tard', date: '2035-12-01' }),
        night({ slug: 'chez-lea', title: 'Soirée chez Léa', date: '2035-11-14', hasVoted: false }),
      ])
    );
    renderHero();

    const card = (await screen.findByText('Soirée chez Léa')).closest('a') as HTMLElement;
    expect(screen.getByText('Votre prochaine soirée')).toBeInTheDocument();
    expect(card).toHaveAttribute('href', '/e/chez-lea');
    expect(within(card).getByText('À vous de voter')).toBeInTheDocument();
    expect(screen.queryByText('Plus tard')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes soirées' })).toHaveAttribute('href', '/my-events');
    expect(screen.getByRole('link', { name: 'Créer une autre soirée' })).toHaveAttribute(
      'href',
      '/new'
    );
    expect(screen.queryByText('Vous n’arrivez pas à choisir ?')).not.toBeInTheDocument();
  });

  it('on a phone: a compact card, its label inside, no Créer une autre soirée', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    server.use(
      authedUserHandler,
      trendingHandler,
      eventsHandler([night({ slug: 'chez-lea', title: 'Soirée chez Léa' })])
    );
    renderHero();

    const card = (await screen.findByText('Soirée chez Léa')).closest('a') as HTMLElement;
    expect(within(card).getByText('Votre prochaine soirée')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Créer une autre soirée' })).not.toBeInTheDocument();
  });

  it('visitor on a phone: one link to create a night, with the short line', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    server.use(authMeGuestHandler, trendingHandler);
    renderHero();

    const link = await screen.findByRole('link', { name: /vous n’arrivez pas à choisir/i });
    expect(link).toHaveAttribute('href', '/new');
    expect(within(link).getByText('Créez une soirée, la roue tranche.')).toBeInTheDocument();
  });

  it('paints a decorative wall of small trending posters, hidden from screen readers', async () => {
    server.use(authMeGuestHandler, trendingHandler);
    const { container } = renderHero();

    await waitFor(() =>
      expect(container.querySelectorAll('img[src*="/w154/"]').length).toBeGreaterThan(0)
    );
    for (const image of container.querySelectorAll('img[src*="/w154/"]')) {
      expect(image).toHaveAttribute('alt', '');
      expect(image.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('tells the header when its search scrolls above the screen, and back', () => {
    let notify: (entries: Partial<IntersectionObserverEntry>[]) => void = () => undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      }
    );
    let hidden = false;
    function Probe() {
      hidden = useHomeSearchHidden();
      return null;
    }
    server.use(authMeGuestHandler, trendingHandler);
    const { unmount } = render(
      <AppTestProviders>
        <MemoryRouter>
          <HomeHero />
          <Probe />
        </MemoryRouter>
      </AppTestProviders>
    );

    act(() => notify([{ isIntersecting: false, boundingClientRect: { top: -40 } as DOMRect }]));
    expect(hidden).toBe(true);
    act(() => notify([{ isIntersecting: true, boundingClientRect: { top: 120 } as DOMRect }]));
    expect(hidden).toBe(false);
    act(() => notify([{ isIntersecting: false, boundingClientRect: { top: 900 } as DOMRect }]));
    expect(hidden).toBe(false);
    act(() =>
      notify([
        { isIntersecting: false, boundingClientRect: { top: -40 } as DOMRect },
        { isIntersecting: true, boundingClientRect: { top: 80 } as DOMRect },
      ])
    );
    expect(hidden).toBe(false);

    act(() => notify([{ isIntersecting: false, boundingClientRect: { top: -40 } as DOMRect }]));
    unmount();
    let afterUnmount = true;
    function After() {
      afterUnmount = useHomeSearchHidden();
      return null;
    }
    render(<After />);
    expect(afterUnmount).toBe(false);
  });
});
