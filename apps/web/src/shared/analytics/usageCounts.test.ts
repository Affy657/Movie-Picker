import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { TEST_API_V1 } from '@/mocks/handlers';
import { reportUsage } from '@/shared/analytics/usageCounts';

describe('reportUsage', () => {
  const server = setupServer();
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('sends the metric and its variant to the anonymous usage counts', async () => {
    const received = new Promise<unknown>((resolve) => {
      server.use(
        http.post(`${TEST_API_V1}/usage-counts`, async ({ request }) => {
          resolve(await request.json());
          return new HttpResponse(null, { status: 204 });
        })
      );
    });

    void reportUsage({ metric: 'event_link_opened', variant: 'visitor.open' });

    await expect(received).resolves.toEqual({
      metric: 'event_link_opened',
      variant: 'visitor.open',
    });
  });

  it('never fails the page when the count is refused', async () => {
    const answered = new Promise<void>((resolve) => {
      server.use(
        http.post(`${TEST_API_V1}/usage-counts`, () => {
          resolve();
          return HttpResponse.json({ reason: 'unknown_usage_count' }, { status: 400 });
        })
      );
    });

    await expect(
      reportUsage({ metric: 'join_prompt_clicked', variant: 'login' })
    ).resolves.toBeUndefined();
    await answered;
  });

  it('never fails the page when the network is down', async () => {
    const attempted = new Promise<void>((resolve) => {
      server.use(
        http.post(`${TEST_API_V1}/usage-counts`, () => {
          resolve();
          return HttpResponse.error();
        })
      );
    });

    await expect(
      reportUsage({ metric: 'recap_viewed', variant: 'account' })
    ).resolves.toBeUndefined();
    await attempted;
  });
});
