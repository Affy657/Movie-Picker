import { ApiError, request, setUnauthorizedHandler } from './client';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const fetchMock = jest.fn();

function res(status: number, body: unknown, contentType = 'application/json'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('request()', () => {
  it('GETs a typed JSON response', async () => {
    fetchMock.mockResolvedValueOnce(res(200, { ok: true }));
    const data = await request<{ ok: boolean }>('/health');
    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/health$/);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
  });

  it('encodes query params', async () => {
    fetchMock.mockResolvedValueOnce(res(200, []));
    await request('/movies/search', { query: { q: 'inception', limit: 5, skip: null } });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('q=inception');
    expect(url).toContain('limit=5');
    expect(url).not.toContain('skip=');
  });

  it('throws ApiError on 4xx with payload', async () => {
    fetchMock.mockResolvedValueOnce(res(400, { detail: 'mauvais format' }));
    await expect(request('/events', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'mauvais format',
    });
  });

  it('invokes the unauthorized handler on 401 (auth route)', async () => {
    fetchMock.mockResolvedValueOnce(res(401, { title: 'Unauthorized' }));
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    await expect(request('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
    setUnauthorizedHandler(null);
  });

  it('returns undefined on 204', async () => {
    fetchMock.mockResolvedValueOnce(res(204, null, ''));
    await expect(request('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
});
