import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import {
  prefetchPublicProfile,
  usePublicProfilePrefetch,
} from '@/features/profile/publicProfilePrefetch';

const { preconnect } = vi.hoisted(() => ({ preconnect: vi.fn() }));

vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  preconnect,
}));

function Probe() {
  usePublicProfilePrefetch();
  return null;
}

function renderAt(path: string) {
  const client = createTestQueryClient();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Probe />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return client;
}

describe('prefetchPublicProfile', () => {
  afterEach(() => {
    preconnect.mockReset();
  });

  it('starts the profile request under the key the page reads, and opens the avatar origin', () => {
    const client = createTestQueryClient();

    prefetchPublicProfile(client, 'alice');

    expect(client.getQueryState(queryKeys.profile.public('alice'))?.fetchStatus).toBe('fetching');
    expect(preconnect).toHaveBeenCalledWith('https://api.dicebear.com');
  });
});

describe('usePublicProfilePrefetch', () => {
  afterEach(() => {
    preconnect.mockReset();
  });

  it('warms the profile up when the application opens on a public profile', () => {
    const client = renderAt('/u/alice');

    expect(client.getQueryState(queryKeys.profile.public('alice'))?.fetchStatus).toBe('fetching');
  });

  it('does nothing on another page', () => {
    const client = renderAt('/watchlist');

    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(preconnect).not.toHaveBeenCalled();
  });
});
