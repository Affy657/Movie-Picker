import { http, HttpResponse } from 'msw';

/** Aligné sur vitest.config env VITE_API_URL */
export const TEST_API_BASE = 'http://127.0.0.1:3999';

export interface MockEventOptions {
  slug: string;
  title?: string;
  terminé?: boolean;
  winnerMovie?: unknown;
}

export function createEventDetailHandlers(opts: MockEventOptions) {
  const title = opts.title ?? 'Soirée MSW';
  const slug = opts.slug;

  return [
    http.get(`${TEST_API_BASE}/events/slug/${slug}`, ({ request }) => {
      const host = new URL(request.url).searchParams.get('host');
      return HttpResponse.json({
        _id: 'evt-msw',
        title,
        date: '2030-12-15',
        time: '21:00',
        slug,
        isHost: !!host,
        terminé: opts.terminé ?? false,
        winnerMovie: opts.winnerMovie ?? null,
      });
    }),
    http.get(`${TEST_API_BASE}/events/${slug}/movies`, () => HttpResponse.json([])),
  ];
}

export function createJoinHandler(slug: string) {
  return http.post(`${TEST_API_BASE}/events/${slug}/join`, async () =>
    HttpResponse.json({ _id: 'p-msw-1', eventId: 'evt-msw', pseudo: 'Alice' }, { status: 201 })
  );
}

export function createSearchAndAddHandlers(slug: string) {
  return [
    http.get(`${TEST_API_BASE}/movies/search`, () =>
      HttpResponse.json([{ id: 100, title: 'Film Test', year: '2024', posterPath: null }])
    ),
    http.post(`${TEST_API_BASE}/events/${slug}/movies`, async () =>
      HttpResponse.json({ _id: 'm-new', title: 'Film Test' }, { status: 201 })
    ),
  ];
}
