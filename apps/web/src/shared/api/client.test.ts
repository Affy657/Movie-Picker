import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiUrl, fetchApi } from '@/shared/api/client';
import { ApiError } from '@/shared/api/apiError';

describe('apiUrl', () => {
  it('préfixe avec la base, version /api/v1, et forme un chemin valide', () => {
    expect(apiUrl('/events')).toMatch(/^https?:\/\/.+\/api\/v1\/events$/);
    expect(apiUrl('events')).toMatch(/\/api\/v1\/events$/);
    expect(apiUrl('/health')).toMatch(/\/health$/);
  });
});

describe('fetchApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('réponse 4xx renvoie une ApiError avec message et code', async () => {
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

  it('réponse 5xx renvoie une erreur', async () => {
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

  it('erreur réseau renvoie message dédié', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError('fetch failed')
    );
    await expect(fetchApi('/events')).rejects.toThrow(/API|connexion|impossible/i);
  });

  it('réponse 200 JSON corps vide renvoie undefined', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(''),
    });
    const data = await fetchApi<unknown>('/events/x');
    expect(data).toBeUndefined();
  });

  it('réponse 200 JSON renvoie les données brutes (sans mapping domaine)', async () => {
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

  it('body malformé avec Content-Type JSON produit ApiError lisible (pas SyntaxError)', async () => {
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

  it('réponse 200 avec body JSON malformé produit ApiError', async () => {
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

  it('fusionne les en-têtes natifs Headers avec Content-Type JSON si body', async () => {
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
