import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import HomeCollectionsRow from './HomeCollectionsRow';

const poster = (name: string) => `https://image.tmdb.org/t/p/w154/${name}.jpg`;

function renderRow() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <HomeCollectionsRow />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('HomeCollectionsRow', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('stacks the saga posters under its name and film count, leading to the saga', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/collections`, () =>
        HttpResponse.json({
          items: [
            {
              id: 10,
              name: 'Star Wars - Saga',
              overview: null,
              posterPath: poster('cover'),
              movieCount: 5,
              previewPosterPaths: [poster('a'), poster('b'), poster('c')],
            },
            {
              id: 11,
              name: 'Duo',
              overview: null,
              posterPath: poster('duo'),
              movieCount: 2,
              previewPosterPaths: [poster('d'), poster('e')],
            },
            {
              id: 12,
              name: 'Ancienne',
              overview: null,
              posterPath: poster('old'),
              movieCount: 3,
            },
          ],
          disclaimer: '',
          tmdbAttributionUrl: '',
        })
      )
    );
    renderRow();

    const saga = await screen.findByRole('link', { name: /5 films/ });
    expect(saga).toHaveAttribute('href', '/films/collection/10');
    expect(saga.querySelectorAll('img')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /2 films/ }).querySelectorAll('img')).toHaveLength(2);
    const older = screen.getByRole('link', { name: /3 films/ });
    expect(older.querySelectorAll('img')).toHaveLength(1);
    expect(older.querySelector('img')).toHaveAttribute('src', expect.stringContaining('old'));
  });
});
