import { describe, expect, it, vi } from 'vitest';
import { QueryObserver, type QueryClient } from '@tanstack/react-query';
import { createAppQueryClient } from '@/app/appQueryClient';
import { ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';

const unauthorized = new ApiError('Session expired', { code: 401 });

function clientWithSessionCheck(session: unknown): {
  client: QueryClient;
  sessionCheck: ReturnType<typeof vi.fn>;
} {
  const client = createAppQueryClient();
  const sessionCheck = vi.fn(() => Promise.resolve(session));
  client.setQueryData(queryKeys.auth.me, session);
  new QueryObserver(client, {
    queryKey: queryKeys.auth.me,
    queryFn: sessionCheck,
    retry: false,
  }).subscribe(() => {});
  return { client, sessionCheck };
}

async function failingQuery(client: QueryClient, error: unknown, key: readonly unknown[] = ['x']) {
  await client
    .fetchQuery({ queryKey: key, queryFn: () => Promise.reject(error as Error), retry: false })
    .catch(() => undefined);
}

async function failingMutation(client: QueryClient, error: unknown) {
  await client
    .getMutationCache()
    .build(client, { mutationFn: () => Promise.reject(error as Error), retry: false })
    .execute(undefined)
    .catch(() => undefined);
}

describe('createAppQueryClient', () => {
  it('asks the session check again after a 401 on a query of a signed-in user', async () => {
    const { client, sessionCheck } = clientWithSessionCheck({ userId: 'u1' });

    await failingQuery(client, unauthorized);

    await vi.waitFor(() => expect(sessionCheck).toHaveBeenCalledTimes(1));
  });

  it('asks the session check again after a 401 on a mutation of a signed-in user', async () => {
    const { client, sessionCheck } = clientWithSessionCheck({ userId: 'u1' });

    await failingMutation(client, unauthorized);

    await vi.waitFor(() => expect(sessionCheck).toHaveBeenCalledTimes(1));
  });

  it('shares one session check between several 401 in a row', async () => {
    const { client, sessionCheck } = clientWithSessionCheck({ userId: 'u1' });

    await Promise.all([
      failingQuery(client, unauthorized, ['a']),
      failingQuery(client, unauthorized, ['b']),
      failingMutation(client, unauthorized),
    ]);

    await vi.waitFor(() => expect(sessionCheck).toHaveBeenCalled());
    expect(sessionCheck).toHaveBeenCalledTimes(1);
  });

  it('leaves an anonymous visitor alone, a 401 is expected there', async () => {
    const { client, sessionCheck } = clientWithSessionCheck(null);

    await failingQuery(client, unauthorized);
    await failingMutation(client, unauthorized);

    expect(sessionCheck).not.toHaveBeenCalled();
  });

  it('leaves the other failures alone', async () => {
    const { client, sessionCheck } = clientWithSessionCheck({ userId: 'u1' });

    await failingQuery(client, new ApiError('Server error', { code: 500 }));
    await failingQuery(client, new ApiError('Forbidden', { code: 403 }));
    await failingQuery(client, new Error('Broken'));

    expect(sessionCheck).not.toHaveBeenCalled();
  });

  it('does not loop when the session check answers 401 itself', async () => {
    const { client, sessionCheck } = clientWithSessionCheck({ userId: 'u1' });
    sessionCheck.mockRejectedValue(unauthorized);

    await client.refetchQueries({ queryKey: queryKeys.auth.me });

    await vi.waitFor(() => expect(sessionCheck).toHaveBeenCalled());
    expect(sessionCheck).toHaveBeenCalledTimes(1);
  });
});
