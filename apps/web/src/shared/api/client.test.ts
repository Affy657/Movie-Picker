import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { apiPath, apiUrl, fetchApi } from '@/shared/api/client';
import { ApiError } from '@/shared/api/apiError';
import { loadLocale } from '@/shared/i18n/locales';
import { fr } from '@/shared/i18n/locales/fr';
import { en } from '@/shared/i18n/locales/en';

describe('apiUrl', () => {
  it('prefixes with the base, the /api/v1 version, and forms a valid path', () => {
    expect(apiUrl('/events')).toMatch(/^https?:\/\/.+\/api\/v1\/events$/);
    expect(apiUrl('events')).toMatch(/\/api\/v1\/events$/);
    expect(apiUrl('/health')).toMatch(/\/health$/);
  });
});

describe('apiPath', () => {
  it('joins the segments into an absolute path', () => {
    expect(apiPath('events', 'Ab3dE_9xYz', 'movies', 42)).toBe('/events/Ab3dE_9xYz/movies/42');
  });

  it('encodes every character that would move the path, query or fragment boundary', () => {
    expect(apiPath('events', 'a?b', 'wheel')).toBe('/events/a%3Fb/wheel');
    expect(apiPath('events', 'a#b')).toBe('/events/a%23b');
    expect(apiPath('events', '../users/me')).toBe('/events/..%2Fusers%2Fme');
    expect(apiPath('events', 'a\r\nb')).toBe('/events/a%0D%0Ab');
    expect(apiPath('events', '100%')).toBe('/events/100%25');
  });

  it('refuses a segment the URL parser would drop or collapse into its parent', () => {
    expect(() => apiPath('events', '..', 'movies')).toThrow(new Error('Invalid API path segment'));
    expect(() => apiPath('events', '.')).toThrow(new Error('Invalid API path segment'));
    expect(() => apiPath('events', '', 'movies')).toThrow(new Error('Invalid API path segment'));
  });

  it('keeps a segment that only contains dots among other characters', () => {
    expect(apiPath('events', '...', 'a.b', '.x', 0)).toBe('/events/.../a.b/.x/0');
  });
});

describe('fetchApi', () => {
  beforeAll(async () => {
    await loadLocale('fr');
    await loadLocale('en');
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('translates a known reason code into the preferred locale, with its params', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            error: 'Limit of 3 proposal(s) per participant reached',
            code: 409,
            reason: 'proposal_limit_reached',
            params: { max: 3 },
          })
        ),
    });
    await expect(fetchApi('/events/slug/x')).rejects.toMatchObject({
      code: 409,
      reason: 'proposal_limit_reached',
      message: fr.apiErrors.proposal_limit_reached.replace('{{max}}', '3'),
    });
  });

  it('follows the locale switch and keeps the server text for an unknown reason', async () => {
    localStorage.setItem('moviepicker-locale', 'en');
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: 'Movie night not found', code: 404, reason: 'event_not_found' })
        ),
    });
    await expect(fetchApi('/events/slug/x')).rejects.toMatchObject({
      message: en.apiErrors.event_not_found,
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: 'Something specific', code: 400, reason: 'brand_new_code' })
        ),
    });
    await expect(fetchApi('/events/slug/x')).rejects.toMatchObject({
      message: 'Something specific',
      reason: 'brand_new_code',
    });
  });

  it('a 4xx response returns an ApiError with message and code', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ error: 'Soirée introuvable' })),
    });
    try {
      await fetchApi('/events/slug/x');
      expect.fail('fetchApi aurait dû lever');
    } catch (e) {
      expect(ApiError.is(e)).toBe(true);
      if (ApiError.is(e)) {
        expect(e.message).toBe('Soirée introuvable');
        expect(e.code).toBe(404);
      }
    }
  });

  it('a 4xx response carries the business reason when the server gives one', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: 'Limite atteinte.', code: 409, reason: 'vote-limit-reached' })
        ),
    });
    await expect(fetchApi('/events/slug/x')).rejects.toMatchObject({
      code: 409,
      reason: 'vote-limit-reached',
    });
  });

  it('a 5xx response returns an error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ error: 'Internal error' })),
    });
    await expect(fetchApi('/events')).rejects.toThrow();
  });

  it('body HTML renvoie une erreur explicite', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve('<html>Not Found</html>'),
    });
    await expect(fetchApi('/events')).rejects.toThrow(/HTML/);
  });

  it('a network error returns a dedicated message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError('fetch failed')
    );
    await expect(fetchApi('/events')).rejects.toThrow(/API|connexion|impossible/i);
  });

  it('a 200 JSON response with an empty body returns undefined', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(''),
    });
    const data = await fetchApi<unknown>('/events/x');
    expect(data).toBeUndefined();
  });

  it('a 202 Accepted response without body nor Content-Type returns undefined (ASP.NET Accepted() case)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 202,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });
    const data = await fetchApi<unknown>('/auth/password-reset/request', {
      method: 'POST',
      body: '{}',
    });
    expect(data).toBeUndefined();
  });

  it('a 200 JSON response returns the raw data (no domain mapping)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            slug: 'abc',
            creatorParticipant: {
              _id: 'p1',
              eventId: 'e1',
              pseudo: 'Tester',
              createdAt: '',
              updatedAt: '',
            },
          })
        ),
    });
    const data = await fetchApi<{ slug: string }>('/events', { method: 'POST', body: '{}' });
    expect(data).toEqual({
      slug: 'abc',
      creatorParticipant: {
        _id: 'p1',
        eventId: 'e1',
        pseudo: 'Tester',
        createdAt: '',
        updatedAt: '',
      },
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('a malformed body with a JSON Content-Type produces a readable ApiError (not a SyntaxError)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('not valid json {{{'),
    });
    try {
      await fetchApi('/events');
      expect.fail('fetchApi aurait dû lever');
    } catch (e) {
      expect(ApiError.is(e)).toBe(true);
      if (ApiError.is(e)) {
        expect(e.code).toBe(502);
        expect(e.message).toContain('Bad Gateway');
      }
    }
  });

  it('a 200 response with a malformed JSON body produces an ApiError', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('not json'),
    });
    try {
      await fetchApi('/events');
      expect.fail('fetchApi aurait dû lever');
    } catch (e) {
      expect(ApiError.is(e)).toBe(true);
      if (ApiError.is(e)) {
        expect(e.message).toContain('JSON');
      }
    }
  });

  it('propage le signal AbortController au fetch natif', async () => {
    const controller = new AbortController();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('{}'),
    });
    await fetchApi('/events', { signal: controller.signal });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it('abort signal propage AbortError sans envelopper dans ApiError', async () => {
    const abortErr = new DOMException('The operation was aborted', 'AbortError');
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortErr);
    try {
      await fetchApi('/events', { signal: new AbortController().signal });
      expect.fail('fetchApi aurait dû lever');
    } catch (e) {
      expect(e).toBe(abortErr);
      expect(ApiError.is(e)).toBe(false);
      expect((e as DOMException).name).toBe('AbortError');
    }
  });

  it('merges the native Headers with a JSON Content-Type when there is a body', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('{}'),
    });
    const h = new Headers();
    h.set('X-Custom', '1');
    await fetchApi('/events', { method: 'POST', body: '{}', headers: h });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'x-custom': '1',
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});
