import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateAllExcept } from './invalidateAllExcept';

function clientWith(keys: readonly (readonly unknown[])[]): QueryClient {
  const client = new QueryClient();
  for (const key of keys) client.setQueryData(key, 'cached');
  return client;
}

const invalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key)?.isInvalidated ?? false;

describe('invalidateAllExcept', () => {
  it('invalidates every query under the prefix but the excluded ones, matched on the whole key', async () => {
    const client = clientWith([
      ['lists', 'mine'],
      ['lists', 'detail', 'l1'],
      ['lists', 'detail', 'l1', 'extra'],
      ['lists', 'members', 'l1'],
      ['watchlist', 'list'],
    ]);

    await invalidateAllExcept(client, ['lists'], [['lists', 'detail', 'l1']]);

    expect(invalidated(client, ['lists', 'mine'])).toBe(true);
    expect(invalidated(client, ['lists', 'detail', 'l1'])).toBe(false);
    expect(invalidated(client, ['lists', 'detail', 'l1', 'extra'])).toBe(true);
    expect(invalidated(client, ['lists', 'members', 'l1'])).toBe(true);
    expect(invalidated(client, ['watchlist', 'list'])).toBe(false);
  });

  it('invalidates the whole prefix when nothing is excluded', async () => {
    const client = clientWith([
      ['lists', 'saved', 'mine'],
      ['lists', 'saved', 'detail', 's1'],
    ]);

    await invalidateAllExcept(client, ['lists', 'saved'], []);

    expect(invalidated(client, ['lists', 'saved', 'mine'])).toBe(true);
    expect(invalidated(client, ['lists', 'saved', 'detail', 's1'])).toBe(true);
  });
});
