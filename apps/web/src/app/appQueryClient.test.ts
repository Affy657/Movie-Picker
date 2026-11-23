import { describe, expect, it } from 'vitest';
import { createAppQueryClient } from '@/app/appQueryClient';
import { queryRetryDelay, shouldRetryQuery } from '@/shared/api/retryPolicy';

describe('createAppQueryClient', () => {
  it('retries and spaces the queries with the shared retry policy', () => {
    const queries = createAppQueryClient().getDefaultOptions().queries;

    expect(queries?.retry).toBe(shouldRetryQuery);
    expect(queries?.retryDelay).toBe(queryRetryDelay);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });
});
