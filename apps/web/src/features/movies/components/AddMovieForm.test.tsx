import { describe, it, expect, vi, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { LocaleProvider } from '@/shared/i18n';
import AddMovieForm from '@/features/movies/components/AddMovieForm';
import { TEST_API_V1, createSearchAndAddHandlers } from '@/mocks/handlers';
import { http, HttpResponse } from 'msw';

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'test-user' }, isLoading: false }),
}));
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

const HISTORY_KEY = 'moviepicker_search_history_test-user';

describe('AddMovieForm (MSW)', () => {
  const slug = 'evt-add';
  const onAdded = vi.fn();

  const server = setupServer(...createSearchAndAddHandlers(slug));

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => localStorage.removeItem(HISTORY_KEY));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('recherche TMDB puis ajoute le film sélectionné (debounce ou bouton)', async () => {
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);

    await user.type(screen.getByPlaceholderText(/rechercher un film/i), 'Inception');
    await waitFor(() => expect(screen.getByText(/film test/i)).toBeInTheDocument(), {
      timeout: 3000,
    });
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));

    await waitFor(() => expect(onAdded).toHaveBeenCalled());
  });

  it('affiche une erreur si la recherche échoue (≥ 2 caractères)', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({ error: 'TMDB down' }, { status: 503 })
      )
    );
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    await user.type(screen.getByPlaceholderText(/rechercher un film/i), 'xx');
    await waitFor(() => expect(screen.getByText(/TMDB down|503/i)).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('désactive Rechercher avec un seul caractère', async () => {
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    await user.type(screen.getByPlaceholderText(/rechercher un film/i), 'x');
    expect(screen.getByRole('button', { name: /^rechercher$/i })).toBeDisabled();
  });

  it('une seule requête si la frappe continue avant la fin du debounce', async () => {
    let searchCalls = 0;
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () => {
        searchCalls += 1;
        return HttpResponse.json({
          items: [
            {
              id: 100,
              title: 'Film Test',
              year: '2024',
              posterPath: null,
              voteAverage: 7.5,
              watchProviders: [],
              tmdbWatchPageUrl: null,
            },
          ],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        });
      })
    );
    const user = userEvent.setup({ delay: null });
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    const input = screen.getByPlaceholderText(/rechercher un film/i);
    await user.type(input, 'ab');
    await new Promise((r) => setTimeout(r, 100));
    await user.type(input, 'c');
    await waitFor(() => expect(screen.getByText(/film test/i)).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(searchCalls).toBe(1);
  });

  it('affiche un message si la recherche ne retourne aucun film', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({
          items: [],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        })
      )
    );
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    await user.type(screen.getByPlaceholderText(/rechercher un film/i), 'zzz');
    await waitFor(() => expect(screen.getByText(/aucun film ne correspond/i)).toBeInTheDocument());
  });

  it('ne relance pas la recherche si seuls des espaces sont ajoutés après le terme', async () => {
    let searchCalls = 0;
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () => {
        searchCalls += 1;
        return HttpResponse.json({
          items: [
            {
              id: 100,
              title: 'Film Test',
              year: '2024',
              posterPath: null,
              voteAverage: 7.5,
              watchProviders: [],
              tmdbWatchPageUrl: null,
            },
          ],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        });
      })
    );
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    const input = screen.getByPlaceholderText(/rechercher un film/i);
    await user.type(input, 'ab');
    await waitFor(() => expect(screen.getByText(/film test/i)).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(searchCalls).toBe(1);

    await user.type(input, '   ');
    await new Promise((r) => setTimeout(r, 500));
    expect(searchCalls).toBe(1);
  });

  it("affiche le dropdown historique au focus si l'input est vide et qu'il y a des entrees", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['inception', 'matrix']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    await user.click(screen.getByPlaceholderText(/rechercher un film/i));
    expect(screen.getByText(/recherches recentes|recherches r/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rechercher.*inception/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rechercher.*matrix/i })).toBeInTheDocument();
  });

  it("supprime une entree individuelle de l'historique via le bouton x", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['inception', 'matrix']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    await user.click(screen.getByPlaceholderText(/rechercher un film/i));
    const removeBtn = screen.getByRole('button', { name: /supprimer.*inception/i });
    await user.click(removeBtn);
    expect(
      screen.queryByRole('button', { name: /Rechercher.*inception/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rechercher.*matrix/i })).toBeInTheDocument();
  });

  it("efface tout l'historique via Effacer tout", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['inception', 'matrix']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    await user.click(screen.getByPlaceholderText(/rechercher un film/i));
    await user.click(screen.getByRole('button', { name: /effacer tout/i }));
    expect(screen.queryByText(/recherches recentes|recherches r/i)).not.toBeInTheDocument();
  });
});
