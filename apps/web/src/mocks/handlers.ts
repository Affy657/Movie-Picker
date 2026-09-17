import { http, HttpResponse } from 'msw';
import type { components } from '@/shared/api/generated/openapiSchema';

type Schemas = components['schemas'];

type EventDetailPayload = Schemas['EventDetailResponse'];

export const TEST_API_BASE = 'http://127.0.0.1:3999';

export const TEST_API_V1 = `${TEST_API_BASE}/api/v1`;

const V1 = TEST_API_V1;

export const authMeGuestHandler = http.get(`${V1}/auth/me`, () =>
  HttpResponse.json(
    { error: 'Authentication required', code: 401, reason: 'unauthorized' },
    { status: 401 }
  )
);

export function createWatchlistHandlers(items: unknown[], availability: unknown[] = []) {
  return [
    http.get(`${V1}/watchlist`, () => HttpResponse.json({ items })),
    http.get(`${V1}/watchlist/availability`, () => HttpResponse.json({ items: availability })),
  ];
}

export interface MockEventOptions {
  slug: string;
  title?: string;
  isFinished?: boolean;
  lifecycle?: string;
  winnerCount?: number;

  theme?: string | null;
}

export function createEventDetailHandlers(opts: MockEventOptions) {
  const title = opts.title ?? 'Soirée MSW';
  const slug = opts.slug;

  return [
    http.get(`${V1}/events/slug/${slug}`, ({ request }) => {
      const host = request.headers.get('X-Host-Token');
      const body: EventDetailPayload = {
        _id: 'evt-msw',
        title,
        date: '2030-12-15',
        time: '21:00',
        slug,
        isHost: !!host,
        isFinished: opts.isFinished ?? false,
        lifecycle: opts.lifecycle ?? (opts.isFinished ? 'finished' : 'live'),
        winners: [],
        participantCount: 4,
        movieCount: 2,
        participants: [
          { _id: 'p-msw-host', pseudo: 'Hôte', isCreator: true },
          { _id: 'p-msw-alice', pseudo: 'Alice' },
          { _id: 'p-msw-bob', pseudo: 'Bob' },
          { _id: 'p-msw-chloe', pseudo: 'Chloé' },
        ],
        config: {
          theme: opts.theme ?? null,
          maxProposalsPerParticipant: null,
          maxParticipants: null,
          maxVotesPerParticipant: null,
          wheelMode: 'strictRandom',
          winnerCount: opts.winnerCount ?? 1,
        },
      };
      return HttpResponse.json(body);
    }),
    http.get(`${V1}/events/${slug}/movies`, () =>
      HttpResponse.json([] satisfies Schemas['MovieWithScoreResponse'][])
    ),
  ];
}

export function createJoinHandler(slug: string) {
  return http.post(`${V1}/events/${slug}/join`, async () => {
    const body: Schemas['JoinEventResult'] = {
      participant: { _id: 'p-msw-1', eventId: 'evt-msw', pseudo: 'Alice' },
      isNew: true,
      message: '',
    };
    return HttpResponse.json(body, { status: 201 });
  });
}

export interface MockUserStats {
  eventsCreated?: number;
  eventsJoined?: number;
  moviesProposed?: number;
  votesCast?: number;
  winningProposals?: number;
  moviesSeen?: number;
  currentStreakWeeks?: number;
  bestStreakWeeks?: number;
  favoriteGenres?: Schemas['GenreCount'][];
  dailyActivity?: Schemas['DailyActivityPoint'][];
}

export function createUserStatsHandler(handle: string, stats?: MockUserStats) {
  return http.get(`${V1}/users/${handle}/stats`, () => {
    const body: Schemas['UserStatsResponse'] = {
      eventsCreated: stats?.eventsCreated ?? 0,
      eventsJoined: stats?.eventsJoined ?? 0,
      moviesProposed: stats?.moviesProposed ?? 0,
      votesCast: stats?.votesCast ?? 0,
      winningProposals: stats?.winningProposals ?? 0,
      moviesSeen: stats?.moviesSeen ?? 0,
      currentStreakWeeks: stats?.currentStreakWeeks ?? 0,
      bestStreakWeeks: stats?.bestStreakWeeks ?? 0,
      favoriteGenres: stats?.favoriteGenres ?? [],
      dailyActivity: stats?.dailyActivity ?? [],
    };
    return HttpResponse.json(body);
  });
}

export function createSearchAndAddHandlers(slug: string) {
  return [
    http.get(`${V1}/movies/search`, () => {
      const body: Schemas['MovieSearchListResponse'] = {
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
      };
      return HttpResponse.json(body);
    }),
    http.post(`${V1}/events/${slug}/movies`, async () => {
      const body: Schemas['MovieWithScoreResponse'] = { _id: 'm-new', title: 'Film Test' };
      return HttpResponse.json(body, { status: 201 });
    }),
  ];
}
