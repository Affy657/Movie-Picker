import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test-utils/queryWrapper';
import { showcaseQueryKey } from '@/features/movies/api/showcaseApi';
import { PROVIDER_KEYS, THEME_KEYS } from '@/features/movies/showcaseSections';
import {
  HOME_SHOWCASE_QUERIES,
  prefetchHomeShowcase,
  useHomeShowcasePrefetch,
} from '@/features/movies/homeShowcasePrefetch';

function Probe() {
  useHomeShowcasePrefetch();
  return null;
}

describe('prefetchHomeShowcase', () => {
  it('lance les requêtes des rangées de la home sous les clés que la page utilisera', () => {
    const client = createTestQueryClient();

    prefetchHomeShowcase(client);

    const keys = [
      showcaseQueryKey({ section: 'provider', provider: PROVIDER_KEYS[0] }),
      showcaseQueryKey({ section: 'trending', genreIds: undefined }),
      showcaseQueryKey({ section: 'now-playing' }),
      showcaseQueryKey({ section: 'theme', theme: THEME_KEYS[0] }),
      showcaseQueryKey({ section: 'most-proposed' }),
      ['movies', 'collections'],
    ];
    for (const key of keys) {
      expect(client.getQueryState(key)?.fetchStatus, key.join('/')).toBe('fetching');
    }
    expect(HOME_SHOWCASE_QUERIES).toHaveLength(5);
  });
});

describe('useHomeShowcasePrefetch', () => {
  it("préchauffe les rangées quand l'application s'ouvre sur la home", () => {
    const client = createTestQueryClient();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/']}>
          <Probe />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(client.getQueryState(showcaseQueryKey({ section: 'trending' }))?.fetchStatus).toBe(
      'fetching'
    );
  });

  it('ne demande rien sur une autre route', () => {
    const client = createTestQueryClient();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/login']}>
          <Probe />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
