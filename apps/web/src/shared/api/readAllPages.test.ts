import { describe, expect, it, vi } from 'vitest';
import { READ_ALL_PAGES_MAX, readAllPages } from '@/shared/api/readAllPages';

describe('readAllPages', () => {
  it('asks for the next page from the number of items already read, while the API says more remain', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], hasMore: true })
      .mockResolvedValueOnce({ items: [3], hasMore: false });

    expect(await readAllPages(fetchPage)).toEqual([1, 2, 3]);
    expect(fetchPage.mock.calls).toEqual([[0], [2]]);
  });

  it('stops on an empty page even when the API still says more remain', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], hasMore: true });

    expect(await readAllPages(fetchPage)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('reads a missing or malformed page as the last one', async () => {
    expect(await readAllPages(vi.fn().mockResolvedValue(null))).toEqual([]);
    expect(await readAllPages(vi.fn().mockResolvedValue({ items: 'nope', hasMore: true }))).toEqual(
      []
    );
  });

  it('keeps the number of requests bounded', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [1], hasMore: true });

    await readAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(READ_ALL_PAGES_MAX);
  });
});
