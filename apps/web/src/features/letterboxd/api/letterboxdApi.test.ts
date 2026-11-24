import { describe, expect, it, vi } from 'vitest';
import { fetchApi, SLOW_REQUEST_TIMEOUT_MS } from '@/shared/api/client';
import { syncLetterboxd } from '@/features/letterboxd/api/letterboxdApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn().mockResolvedValue({}),
}));

describe('syncLetterboxd', () => {
  it('waits as long as the server may read Letterboxd, beyond the usual slow request timeout', async () => {
    await syncLetterboxd(true);

    const [path, init] = vi.mocked(fetchApi).mock.calls[0]!;
    expect(path).toBe('/letterboxd/sync?force=true');
    expect(init?.timeoutMs).toBeGreaterThanOrEqual(280_000);
    expect(init?.timeoutMs).toBeGreaterThan(SLOW_REQUEST_TIMEOUT_MS);
  });
});
