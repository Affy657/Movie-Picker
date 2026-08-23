import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ProfileMoviesSection from './ProfileMoviesSection';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

function renderSection(handle: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileMoviesSection handle={handle} />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileMoviesSection (MSW)', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 }))
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('ne rend rien si la liste est vide', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/movies`, () =>
        HttpResponse.json({ items: [], totalCount: 0 })
      )
    );

    const { container } = renderSection('alice');

    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('affiche le titre, les films et le badge gagnant', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/movies`, () =>
        HttpResponse.json({
          items: [
            {
              title: 'Inception',
              year: '2010',
              posterPath: '/x.jpg',
              genreIds: [28],
              mediaType: 'movie',
              proposedAt: '2026-06-01T00:00:00Z',
              isWinner: true,
            },
            {
              title: 'Interstellar',
              year: '2014',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              proposedAt: '2026-05-01T00:00:00Z',
              isWinner: false,
            },
          ],
          totalCount: 2,
        })
      )
    );

    renderSection('alice');

    expect(
      await screen.findByRole('heading', { name: /derniers films proposés/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /film gagnant/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tout voir/i })).toHaveAttribute(
      'href',
      '/u/alice/films'
    );
  });

  it("n'affiche pas de badge gagnant sur un film sans affiche et sans victoire", async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/bob/movies`, () =>
        HttpResponse.json({
          items: [
            {
              title: 'Sans affiche',
              year: '2020',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              proposedAt: '2026-01-01T00:00:00Z',
              isWinner: false,
            },
          ],
          totalCount: 1,
        })
      )
    );

    renderSection('bob');

    await screen.findByText('Sans affiche');
    expect(screen.queryByRole('img', { name: /film gagnant/i })).not.toBeInTheDocument();
  });
});
