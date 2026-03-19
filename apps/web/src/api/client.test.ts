import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiUrl, fetchApi } from './client';
import { ApiError } from './apiError';

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

  it('réponse 200 JSON renvoie les données', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ slug: 'abc', hostToken: 'ht' })),
    });
    const data = await fetchApi<{ slug: string }>('/events', { method: 'POST', body: '{}' });
    expect(data).toEqual({ slug: 'abc', hostToken: 'ht' });
  });
});
