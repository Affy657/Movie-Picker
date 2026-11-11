import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import HomeThemeFans from './HomeThemeFans';

function posters(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `${prefix} ${index + 1}`,
    posterPath: `https://image.tmdb.org/t/p/w154/${prefix}-${index}.jpg`,
  }));
}

function renderFans() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <HomeThemeFans />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('HomeThemeFans', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('fans out three posters per theme, in the app order, each leading to its theme', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/showcase/themes`, () =>
        HttpResponse.json({
          items: [
            { theme: 'annees-80', posters: posters('eighties', 3) },
            { theme: 'frissons', posters: posters('chills', 3) },
          ],
        })
      )
    );
    renderFans();

    const section = (
      await screen.findByRole('heading', { name: 'Suggestions thématiques', level: 2 })
    ).closest('section') as HTMLElement;
    expect(within(section).getByText('Une sélection prête à lancer')).toBeInTheDocument();
    const links = await within(section).findAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(["Frissons d'automne", 'Années 80']);
    expect(links[0]).toHaveAttribute('href', '/films/theme/frissons');
    expect((links[0] as HTMLElement).querySelectorAll('img')).toHaveLength(3);
  });

  it('leaves out a theme without poster and a theme the app does not know', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/showcase/themes`, () =>
        HttpResponse.json({
          items: [
            { theme: 'frissons', posters: [] },
            { theme: 'westerns', posters: posters('west', 3) },
            { theme: 'en-famille', posters: posters('family', 2) },
          ],
        })
      )
    );
    renderFans();

    const links = await screen.findAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['En famille']);
    expect((links[0] as HTMLElement).querySelectorAll('img')).toHaveLength(2);
  });

  it('shows nothing when no theme has a poster', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/showcase/themes`, () => HttpResponse.json({ items: [] }))
    );
    renderFans();

    expect(screen.getByRole('heading', { name: 'Suggestions thématiques' })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Suggestions thématiques' })
      ).not.toBeInTheDocument()
    );
  });

  it('offers a retry when the themes fail to load', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/showcase/themes`, () =>
        HttpResponse.json({}, { status: 503 })
      )
    );
    renderFans();

    expect(await screen.findByRole('button', { name: /réessayer/i })).toBeInTheDocument();
  });
});
