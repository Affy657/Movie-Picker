import { http, HttpResponse } from 'msw';

export const TEST_API_BASE = 'http://127.0.0.1:3999';

export const TEST_API_V1 = `${TEST_API_BASE}/api/v1`;

const V1 = TEST_API_V1;

export const authMeGuestHandler = http.get(`${V1}/auth/me`, () =>
  HttpResponse.json({ error: 'Non authentifié.', code: 401 }, { status: 401 })
);

export interface MockEventOptions {
  slug: string;
  title?: string;
  isFinished?: boolean;
  winnerMovie?: unknown;

  theme?: string | null;
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
        isFinished: opts.isFinished ?? false,
        winnerMovie: opts.winnerMovie ?? null,
        participantCount: 3,
        movieCount: 2,
        participants: [
          { _id: 'p-msw-alice', pseudo: 'Alice' },
          { _id: 'p-msw-bob', pseudo: 'Bob' },
          { _id: 'p-msw-chloe', pseudo: 'Chloé' },
        ],
        config: {
          theme: opts.theme ?? null,
          endDate: null,
          maxProposalsPerParticipant: null,
          maxParticipants: null,
          wheelMode: 'strictRandom',
        },
      });
    }),
    http.get(`${V1}/events/${slug}/movies`, () => HttpResponse.json([])),
  ];
}

export function createJoinHandler(slug: string) {
  return http.post(`${V1}/events/${slug}/join`, async () =>
    HttpResponse.json(
      {
        participant: { _id: 'p-msw-1', eventId: 'evt-msw', pseudo: 'Alice' },
        isNew: true,
        message: '',
      },
      { status: 201 }
    )
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
            runtimeMinutes: 112,
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
