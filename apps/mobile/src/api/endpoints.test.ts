import * as auth from './auth';
import * as events from './events';
import * as movies from './movies';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const fetchMock = jest.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

function emptyResponse(): Response {
  return {
    ok: true,
    status: 204,
    headers: { get: () => null },
    json: async () => null,
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function lastUrl(): string {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return call[0] as string;
}

function lastInit(): RequestInit {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return call[1] as RequestInit;
}

describe('api/auth endpoints', () => {
  it('register POST /auth/register without auth', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { userId: 'u1' }));
    await auth.register({ email: 'a@b.com', password: 'pwd' } as Parameters<
      typeof auth.register
    >[0]);
    expect(lastUrl()).toMatch(/\/auth\/register$/);
    expect(lastInit().method).toBe('POST');
  });

  it('login POST /auth/login', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { userId: 'u1' }));
    await auth.login({ email: 'a@b.com', password: 'pwd' } as Parameters<typeof auth.login>[0]);
    expect(lastUrl()).toMatch(/\/auth\/login$/);
  });

  it('logout POST /auth/logout', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse());
    await auth.logout();
    expect(lastUrl()).toMatch(/\/auth\/logout$/);
    expect(lastInit().method).toBe('POST');
  });

  it('getMe GET /auth/me with optional signal', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { userId: 'u1' }));
    const ctrl = new AbortController();
    await auth.getMe({ signal: ctrl.signal });
    expect(lastUrl()).toMatch(/\/auth\/me$/);
    expect(lastInit().signal).toBe(ctrl.signal);
  });

  it('patchMe PATCH /auth/me', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await auth.patchMe({ displayName: 'Bob' } as Parameters<typeof auth.patchMe>[0]);
    expect(lastInit().method).toBe('PATCH');
  });

  it('changePassword PATCH /auth/me/password', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse());
    await auth.changePassword({
      currentPassword: 'a',
      newPassword: 'b',
    } as Parameters<typeof auth.changePassword>[0]);
    expect(lastUrl()).toMatch(/\/auth\/me\/password$/);
  });

  it('requestPasswordReset POST /auth/password-reset/request', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse());
    await auth.requestPasswordReset({ email: 'a@b.com' } as Parameters<
      typeof auth.requestPasswordReset
    >[0]);
    expect(lastUrl()).toMatch(/\/auth\/password-reset\/request$/);
  });

  it('confirmPasswordReset POST /auth/password-reset/confirm', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await auth.confirmPasswordReset({
      token: 't',
      newPassword: 'p',
    } as Parameters<typeof auth.confirmPasswordReset>[0]);
    expect(lastUrl()).toMatch(/\/auth\/password-reset\/confirm$/);
  });
});

describe('api/events endpoints', () => {
  it('createEvent POST /events', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 'e1' }));
    await events.createEvent({ title: 'x', date: '2026-06-15' } as Parameters<
      typeof events.createEvent
    >[0]);
    expect(lastUrl()).toMatch(/\/events$/);
    expect(lastInit().method).toBe('POST');
  });

  it('getMyEvents GET /events/mine', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { events: [] }));
    await events.getMyEvents();
    expect(lastUrl()).toMatch(/\/events\/mine$/);
  });

  it('getEvent encodes slug', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 'e1' }));
    await events.getEvent('my slug/with#chars');
    expect(lastUrl()).toMatch(/\/events\/slug\/my%20slug%2Fwith%23chars$/);
  });

  it('joinEvent uses noAuth POST /events/:slug/join', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { participant: { _id: 'p1' } }));
    await events.joinEvent('slug', { pseudo: 'Lea' } as Parameters<typeof events.joinEvent>[1]);
    expect(lastUrl()).toMatch(/\/events\/slug\/join$/);
    expect(lastInit().method).toBe('POST');
  });

  it('spinWheel POST /events/:slug/wheel', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { winner: null }));
    await events.spinWheel('slug');
    expect(lastUrl()).toMatch(/\/events\/slug\/wheel$/);
  });

  it('closeEvent POST /events/:slug/close', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await events.closeEvent('slug');
    expect(lastUrl()).toMatch(/\/events\/slug\/close$/);
  });

  it('removeParticipant DELETE /events/:slug/participants/:id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await events.removeParticipant('slug', 'p1');
    expect(lastUrl()).toMatch(/\/events\/slug\/participants\/p1$/);
    expect(lastInit().method).toBe('DELETE');
  });

  it('deleteEvent DELETE /events/:slug', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse());
    await events.deleteEvent('slug');
    expect(lastInit().method).toBe('DELETE');
  });

  it('patchConfig adds host query string when token provided', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await events.patchConfig('slug', { theme: 'pizza' }, 'host-tok');
    expect(lastUrl()).toContain('host=host-tok');
  });
});

describe('api/movies endpoints', () => {
  it('listMovies GET /events/:slug/movies optional participantId', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));
    await movies.listMovies('slug', 'p1');
    expect(lastUrl()).toContain('participantId=p1');
  });

  it('addMovie POST /events/:slug/movies', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, {}));
    await movies.addMovie('slug', { tmdbId: 1, title: 'X' } as Parameters<
      typeof movies.addMovie
    >[1]);
    expect(lastInit().method).toBe('POST');
  });

  it('vote POST /events/:slug/movies/:id/vote', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await movies.vote('slug', 'm1', { participantId: 'p1', value: 1 } as Parameters<
      typeof movies.vote
    >[2]);
    expect(lastUrl()).toMatch(/\/movies\/m1\/vote$/);
  });

  it('cancelVote DELETE with participantId query', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse());
    await movies.cancelVote('slug', 'm1', 'p1');
    expect(lastUrl()).toContain('participantId=p1');
    expect(lastInit().method).toBe('DELETE');
  });

  it('markSeen POST /events/:slug/movies/:id/seen', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await movies.markSeen('slug', 'm1', { participantId: 'p1' } as Parameters<
      typeof movies.markSeen
    >[2]);
    expect(lastUrl()).toMatch(/\/movies\/m1\/seen$/);
  });

  it('unmarkSeen DELETE /events/:slug/movies/:id/seen', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse());
    await movies.unmarkSeen('slug', 'm1', 'p1');
    expect(lastInit().method).toBe('DELETE');
  });

  it('removeMovie DELETE /events/:slug/movies/:id', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse());
    await movies.removeMovie('slug', 'm1');
    expect(lastUrl()).toMatch(/\/movies\/m1$/);
  });

  it('searchTmdb GET /movies/search?q=...', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [] }));
    await movies.searchTmdb('inception');
    expect(lastUrl()).toContain('q=inception');
  });

  it('getMovieDetails GET /movies/tmdb/:id/details', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await movies.getMovieDetails(123);
    expect(lastUrl()).toMatch(/\/movies\/tmdb\/123\/details$/);
  });
});
