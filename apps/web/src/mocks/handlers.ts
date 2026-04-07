import { http, HttpResponse } from 'msw';

/** Aligné sur vitest.config env VITE_API_URL */
export const TEST_API_BASE = 'http://127.0.0.1:3999';

/** Base MSW pour les routes versionnées (`/api/v1`). */
export const TEST_API_V1 = `${TEST_API_BASE}/api/v1`;

const V1 = TEST_API_V1;

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
    http.get(`${V1}/events/slug/${slug}`, ({ request }) => {
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
    http.get(`${V1}/events/${slug}/movies`, () => HttpResponse.json([])),
  ];
}

export function createJoinHandler(slug: string) {
  return http.post(`${V1}/events/${slug}/join`, async () =>
    HttpResponse.json({ _id: 'p-msw-1', eventId: 'evt-msw', pseudo: 'Alice' }, { status: 201 })
  );
}

export function createSearchAndAddHandlers(slug: string) {
  return [
    http.get(`${V1}/movies/search`, () =>
      HttpResponse.json({
        items: [
          {
            id: 100,
            title: 'Film Test',
            year: '2024',
            posterPath: null,
            voteAverage: 7.5,
            watchProviders: [
              { providerId: 8, name: 'Netflix MSW', logoPath: null, type: 'flatrate' },
            ],
            tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/100/watch',
          },
        ],
        watchProvidersRegion: 'FR',
        disclaimer:
          'Les notes et les offres de visionnage (streaming / VOD) sont indicatives, issues de The Movie Database (TMDB). Les services disponibles peuvent varier.',
        tmdbAttributionUrl: 'https://www.themoviedb.org/',
      })
    ),
    http.post(`${V1}/events/${slug}/movies`, async () =>
      HttpResponse.json({ _id: 'm-new', title: 'Film Test' }, { status: 201 })
    ),
  ];
}
