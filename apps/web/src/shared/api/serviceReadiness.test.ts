import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { delay, http, HttpResponse } from 'msw';
import { apiErrorJson, apiJson, type ApiSchemas } from '@/mocks/apiJson';
import { TEST_API_BASE } from '@/mocks/handlers';
import { ApiError } from '@/shared/api/apiError';
import { fetchServiceReadiness } from '@/shared/api/serviceReadiness';

const READY_URL = `${TEST_API_BASE}/health/ready`;

const READY: ApiSchemas['HealthReadyResponse'] = {
  status: 'ready',
  service: 'movie-picker-api',
  release: 'a58726d3f1c2',
  dependencies: [{ name: 'mongodb', status: 'ok', durationMs: 12 }],
};

const DATABASE_DOWN: ApiSchemas['HealthReadyResponse'] = {
  ...READY,
  status: 'unavailable',
  dependencies: [{ name: 'mongodb', status: 'unavailable', durationMs: 2000 }],
};

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchServiceReadiness', () => {
  it('returns what the probe reports when the API is ready', async () => {
    server.use(http.get(READY_URL, () => apiJson<'HealthReadyResponse'>(READY)));

    await expect(fetchServiceReadiness()).resolves.toEqual({ reachable: true, readiness: READY });
  });

  it('reads the report the probe sends with its 503 when the database does not answer', async () => {
    server.use(
      http.get(READY_URL, () => apiJson<'HealthReadyResponse'>(DATABASE_DOWN, { status: 503 }))
    );

    await expect(fetchServiceReadiness()).resolves.toEqual({
      reachable: true,
      readiness: DATABASE_DOWN,
    });
  });

  it('marks the API unreachable when the network fails', async () => {
    server.use(http.get(READY_URL, () => HttpResponse.error()));

    await expect(fetchServiceReadiness()).resolves.toEqual({ reachable: false });
  });

  it('marks the API unreachable when the platform answers in its place', async () => {
    server.use(
      http.get(
        READY_URL,
        () =>
          new HttpResponse('<html>Service Unavailable</html>', {
            status: 503,
            headers: { 'content-type': 'text/html' },
          })
      )
    );

    await expect(fetchServiceReadiness()).resolves.toEqual({ reachable: false });
  });

  it('marks the API unreachable when the probe does not answer in time', async () => {
    server.use(
      http.get(READY_URL, async () => {
        await delay('infinite');
        return apiJson<'HealthReadyResponse'>(READY);
      })
    );

    await expect(fetchServiceReadiness({ timeoutMs: 20 })).resolves.toEqual({
      reachable: false,
    });
  });

  it('fails with a rate limit error so the last known state stays on screen', async () => {
    server.use(http.get(READY_URL, () => apiErrorJson(429, 'rate_limited')));

    const failure = await fetchServiceReadiness().catch((error: unknown) => error);

    expect(ApiError.is(failure) && failure.code).toBe(429);
  });

  it('stops when the caller aborts', async () => {
    server.use(
      http.get(READY_URL, async () => {
        await delay('infinite');
        return apiJson<'HealthReadyResponse'>(READY);
      })
    );
    const controller = new AbortController();

    const pending = fetchServiceReadiness({ signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
