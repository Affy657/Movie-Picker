import { describe, expect, it } from 'vitest';
import { apiErrorJson, apiJson } from './apiJson';

describe('apiJson', () => {
  it('answers the payload as JSON with the given status', async () => {
    const response = apiJson<'NotificationUnreadCountResponse'>(
      { unreadCount: 3 },
      { status: 201 }
    );

    expect(response.status).toBe(201);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.json()).toEqual({ unreadCount: 3 });
  });

  it('answers a list of a contract schema', async () => {
    const response = apiJson<'GenreCount[]'>([{ genreId: 27, count: 2 }]);

    expect(await response.json()).toEqual([{ genreId: 27, count: 2 }]);
  });

  it('refuses at compile time a payload the contract does not describe', () => {
    const payloadsThatMustNotCompile = [
      // @ts-expect-error a required field of the schema is missing
      () => apiJson<'NotificationUnreadCountResponse'>({}),
      // @ts-expect-error a field the schema does not serve
      () => apiJson<'NotificationUnreadCountResponse'>({ unreadCount: 1, count: 1 }),
      // @ts-expect-error the schema must be named
      () => apiJson({ unreadCount: 1 }),
      // @ts-expect-error not a schema of the contract
      () => apiJson<'NoSuchResponse'>({}),
    ];

    expect(payloadsThatMustNotCompile).toHaveLength(4);
  });

  it('answers the error envelope of the API', async () => {
    const response = apiErrorJson(409, 'list_full', { max: 500 });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'list_full',
      code: 409,
      reason: 'list_full',
      params: { max: 500 },
    });
  });
});
