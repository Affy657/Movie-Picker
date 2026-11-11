import { describe, it, expect, vi, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { LocaleProvider, useLocale } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import AddMovieForm from '@/features/movies/components/AddMovieForm';
import type { MovieSearchItem } from '@/features/movies/api/moviesApi';
import { TEST_API_V1, createSearchAndAddHandlers } from '@/mocks/handlers';
import { http, HttpResponse } from 'msw';

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'test-user' }, isLoading: false }),
}));
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

function renderWithLocale(ui: React.ReactElement) {
  return render(
    <QueryClientWrapper>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientWrapper>
  );
}

const HISTORY_KEY = 'moviepicker_search_history_test-user';

function SwitchToEnglishButton() {
  const { setLocale } = useLocale();
  return (
    <button type="button" onClick={() => setLocale('en')}>
      switch-to-english
    </button>
  );
}

const FILM_TEST_RESPONSE = {
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
};

type RecordedSearch = { q: string | null; genreIds: string | null; lang: string | null };

function recordSearches(searches: RecordedSearch[]) {
  return http.get(`${TEST_API_V1}/movies/search`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    searches.push({
      q: params.get('q'),
      genreIds: params.get('genreIds'),
      lang: params.get('lang'),
    });
    return HttpResponse.json(FILM_TEST_RESPONSE);
  });
}

describe('AddMovieForm (MSW)', () => {
  const slug = 'evt-add';
  const onAdded = vi.fn();
  const onAddItem = vi.fn((_item: MovieSearchItem) => Promise.resolve());

  const server = setupServer(...createSearchAndAddHandlers(slug));

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => localStorage.removeItem(HISTORY_KEY));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('searches TMDB then adds the selected movie (debounce or button)', async () => {
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);

    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'Inception');
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter « Film Test »' }));

    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(onAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 100, title: 'Film Test' })
    );
  });

  it('shows an error when the search fails (2 characters or more)', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({ error: 'TMDB down' }, { status: 503 })
      )
    );
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'xx');
    expect(await screen.findByText(/TMDB down|503/i, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('a single request when typing continues before the end of the debounce', async () => {
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
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    const input = screen.getByRole('searchbox', { name: 'Chercher un film' });
    await user.type(input, 'ab');
    await new Promise((r) => setTimeout(r, 100));
    await user.type(input, 'c');
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(searchCalls).toBe(1);
  });

  it('dragging the runtime slider sends a single search once the debounce settles', async () => {
    const searchedRuntimeMax: (string | null)[] = [];
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, ({ request }) => {
        searchedRuntimeMax.push(new URL(request.url).searchParams.get('runtimeMax'));
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
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'Inception');
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(searchedRuntimeMax).toEqual([null]);

    await user.click(screen.getByRole('button', { name: /filtres avancés/i }));
    const maxSlider = screen.getByRole('slider', { name: 'Durée maximum' });
    for (const minutes of [175, 170, 165, 160, 155, 150]) {
      fireEvent.change(maxSlider, { target: { value: String(minutes) } });
    }

    await new Promise((r) => setTimeout(r, 600));
    expect(searchedRuntimeMax).toEqual([null, '150']);
  });

  it('a filter changed after a filters-only search runs the search again instead of clearing it', async () => {
    const searchedGenres: (string | null)[] = [];
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, ({ request }) => {
        searchedGenres.push(new URL(request.url).searchParams.get('genreIds'));
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
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.click(screen.getByRole('button', { name: /filtres avancés/i }));
    await user.click(screen.getByRole('button', { name: 'Action' }));
    await user.click(screen.getByRole('button', { name: 'Comédie' }));
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(searchedGenres.at(-1)).toBe('28,35');

    await user.click(screen.getByRole('button', { name: /filtres avancés/i }));
    await user.click(screen.getByRole('button', { name: 'Comédie' }));

    await waitFor(() => expect(searchedGenres.at(-1)).toBe('28'));
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('erasing a typed letter while filters are set runs the filters-only search again', async () => {
    const searches: RecordedSearch[] = [];
    server.use(recordSearches(searches));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.click(screen.getByRole('button', { name: /filtres avancés/i }));
    await user.click(screen.getByRole('button', { name: 'Action' }));
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(searches).toHaveLength(1);

    const input = screen.getByRole('searchbox', { name: 'Chercher un film' });
    await user.type(input, 'a');
    await user.type(input, '{Backspace}');

    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(searches.at(-1)).toEqual({ q: '', genreIds: '28', lang: 'fr-FR' });
  });

  it('a language change while filters are set searches again in the new language instead of clearing', async () => {
    const searches: RecordedSearch[] = [];
    server.use(recordSearches(searches));
    const user = userEvent.setup();
    renderWithLocale(
      <>
        <SwitchToEnglishButton />
        <AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />
      </>
    );
    await user.click(screen.getByRole('button', { name: /filtres avancés/i }));
    await user.click(screen.getByRole('button', { name: 'Action' }));
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'switch-to-english' }));

    await waitFor(() => expect(searches.at(-1)).toEqual({ q: '', genreIds: '28', lang: 'en-US' }));
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('a movie and a series sharing a TMDB id both get their own result row', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({
          items: [
            {
              id: 1399,
              mediaType: 'movie',
              title: 'Homonyme Film',
              year: '2011',
              posterPath: null,
              voteAverage: 7.1,
              tmdbWatchPageUrl: null,
            },
            {
              id: 1399,
              mediaType: 'tv',
              title: 'Homonyme Série',
              year: '2011',
              posterPath: null,
              voteAverage: 8.4,
              tmdbWatchPageUrl: null,
            },
          ],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        })
      )
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const user = userEvent.setup();
      renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
      await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'Homonyme');

      expect(await screen.findByText('Homonyme Série', {}, { timeout: 3000 })).toBeInTheDocument();
      expect(screen.getByText('Homonyme Film')).toBeInTheDocument();
      const duplicateKeyWarnings = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('same key'))
      );
      expect(duplicateKeyWarnings).toEqual([]);
    } finally {
      consoleError.mockRestore();
    }
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
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'zzz');
    expect(await screen.findByText(/aucun film ne correspond/i)).toBeInTheDocument();
  });

  it('does not search again when only spaces are added after the term', async () => {
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
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    const input = screen.getByRole('searchbox', { name: 'Chercher un film' });
    await user.type(input, 'ab');
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(searchCalls).toBe(1);

    await user.type(input, '   ');
    await new Promise((r) => setTimeout(r, 500));
    expect(searchCalls).toBe(1);
  });

  it("affiche le dropdown historique au focus si l'input est vide et qu'il y a des entrees", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['inception', 'matrix']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.click(screen.getByRole('searchbox', { name: 'Chercher un film' }));
    expect(screen.getByText(/recherches recentes|recherches r/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rechercher.*inception/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rechercher.*matrix/i })).toBeInTheDocument();
  });

  it("supprime une entree individuelle de l'historique via le bouton x", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['inception', 'matrix']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.click(screen.getByRole('searchbox', { name: 'Chercher un film' }));
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
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.click(screen.getByRole('searchbox', { name: 'Chercher un film' }));
    await user.click(screen.getByRole('button', { name: /effacer tout/i }));
    expect(screen.queryByText(/recherches recentes|recherches r/i)).not.toBeInTheDocument();
  });

  it('the down arrow enters the history from the field and Enter runs that search', async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['inception', 'matrix']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    const input = screen.getByRole('searchbox', { name: 'Chercher un film' });
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /Rechercher.*inception/i })).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('matrix');
    expect(await screen.findByText(/film test/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/recherches r/i)).not.toBeInTheDocument();
  });

  it('Escape hides the history until the field is left or edited', async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['inception']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    const input = screen.getByRole('searchbox', { name: 'Chercher un film' });
    await user.click(input);
    expect(screen.getByText(/recherches r/i)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText(/recherches r/i)).not.toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /Rechercher.*inception/i })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(input).toHaveFocus();
    expect(screen.queryByText(/recherches r/i)).not.toBeInTheDocument();
    await user.keyboard('x{Backspace}');
    expect(screen.getByText(/recherches r/i)).toBeInTheDocument();
  });

  it('the history comes back once a selected search is erased from the field', async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['inception']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    const input = screen.getByRole('searchbox', { name: 'Chercher un film' });
    await user.click(input);
    await user.click(screen.getByRole('button', { name: /Rechercher.*inception/i }));
    expect(input).toHaveValue('inception');
    expect(screen.queryByText(/recherches r/i)).not.toBeInTheDocument();
    await user.clear(input);
    expect(screen.getByText(/recherches r/i)).toBeInTheDocument();
  });

  it('hides the streaming providers and the region reminder when showWatchProviders is off', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({
          items: [
            {
              id: 103,
              title: 'Film Sans Providers Affichés',
              year: '2024',
              posterPath: null,
              voteAverage: 7.5,
              watchProviders: [
                { providerId: 1, name: 'Netflix Abonnement', logoPath: null, type: 'flatrate' },
              ],
              tmdbWatchPageUrl: null,
            },
          ],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        })
      )
    );
    const user = userEvent.setup();
    renderWithLocale(
      <AddMovieForm onAddItem={onAddItem} onAdded={onAdded} showWatchProviders={false} />
    );
    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'Inception');

    expect(await screen.findByText('Film Sans Providers Affichés')).toBeInTheDocument();
    expect(screen.queryByText('Netflix Abonnement')).not.toBeInTheDocument();
    expect(screen.queryByText(/région/i)).not.toBeInTheDocument();
  });

  it('puts the focus back in the search field after an addition', async () => {
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);

    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'Inception');
    await user.click(await screen.findByRole('button', { name: 'Ajouter « Film Test »' }));

    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(screen.getByRole('searchbox', { name: 'Chercher un film' })).toHaveFocus();
  });

  it('does not reopen the search history when the focus comes back after an addition', async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['matrix']));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);

    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'Inception');
    await user.click(await screen.findByRole('button', { name: 'Ajouter « Film Test »' }));

    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: 'Chercher un film' })).toHaveFocus()
    );
    expect(screen.queryByRole('button', { name: /Rechercher.*matrix/i })).not.toBeInTheDocument();
  });

  it('donne le focus au champ de recherche au montage', async () => {
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);

    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: 'Chercher un film' })).toHaveFocus()
    );
  });

  it('tells on each result whether the movie streams, with no rental or purchase detail', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({
          items: [
            {
              id: 100,
              title: 'Film Abonnement',
              year: '2024',
              posterPath: null,
              voteAverage: 7.5,
              runtimeMinutes: 128,
              watchProviders: [
                { providerId: 1, name: 'Netflix Abonnement', logoPath: null, type: 'flatrate' },
                { providerId: 2, name: 'Louer Ici', logoPath: null, type: 'rent' },
              ],
              tmdbWatchPageUrl: null,
            },
            {
              id: 101,
              title: 'Film Location Seule',
              year: '2023',
              posterPath: null,
              voteAverage: 6.1,
              watchProviders: [{ providerId: 5, name: 'Louer Là', logoPath: null, type: 'rent' }],
              tmdbWatchPageUrl: null,
            },
          ],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        })
      )
    );
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'Film');

    const rows = within(
      await screen.findByRole('list', { name: 'Résultats de la recherche' })
    ).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('En streaming');
    expect(within(rows[0]!).getByRole('img', { name: /Netflix Abonnement/ })).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent('2h08');
    expect(rows[1]).toHaveTextContent('Pas en streaming');
    expect(screen.queryByText('Louer Ici')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /location/i })).not.toBeInTheDocument();
  });

  it('keeps the results on screen after an addition', async () => {
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    const input = screen.getByRole('searchbox', { name: 'Chercher un film' });
    await user.type(input, 'Inception');
    await user.click(await screen.findByRole('button', { name: 'Ajouter « Film Test »' }));

    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(input).toHaveValue('Inception');
    expect(screen.getByText('Film Test')).toBeInTheDocument();
  });

  it('lets the caller replace the action of a result and open its details', async () => {
    const onOpenItem = vi.fn();
    const user = userEvent.setup();
    renderWithLocale(
      <AddMovieForm
        onAddItem={onAddItem}
        onAdded={onAdded}
        onOpenItem={onOpenItem}
        renderItemAside={(item) =>
          item.id === 100
            ? { status: <span>Déjà là</span>, action: <span>Rien à faire</span> }
            : undefined
        }
      />
    );
    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'Inception');

    expect(await screen.findByText('Rien à faire')).toBeInTheDocument();
    expect(screen.getByText('Déjà là')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter « Film Test »' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir la fiche de « Film Test »' }));
    expect(onOpenItem).toHaveBeenCalledWith(expect.objectContaining({ id: 100 }));
  });

  it('shows the suggestions while nothing is typed and filters them without searching', async () => {
    const searches: RecordedSearch[] = [];
    server.use(recordSearches(searches));
    const suggestions: MovieSearchItem[] = [
      {
        id: 7,
        title: 'Suggestion Streaming',
        year: '2023',
        posterPath: null,
        voteAverage: 7.9,
        runtimeMinutes: 100,
        watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
      },
      {
        id: 8,
        title: 'Suggestion Hors Streaming',
        year: '2022',
        posterPath: null,
        voteAverage: 6.2,
        runtimeMinutes: 140,
        watchProviders: [],
      },
    ];
    const user = userEvent.setup();
    renderWithLocale(
      <AddMovieForm
        onAddItem={onAddItem}
        onAdded={onAdded}
        quickFilters
        suggestions={{ title: 'Dans ma liste', items: suggestions }}
      />
    );

    const list = screen.getByRole('list', { name: 'Dans ma liste' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'En streaming' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'En streaming' }));
    await user.click(screen.getByRole('button', { name: 'Moins de 2 h' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(list).toHaveTextContent('Suggestion Streaming');
    await new Promise((r) => setTimeout(r, 450));
    expect(searches).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Ajouter « Suggestion Streaming »' }));
    await waitFor(() => expect(onAddItem).toHaveBeenCalledWith(expect.objectContaining({ id: 7 })));
  });

  it('offers the recent searches as buttons when asked to', async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['matrix']));
    const searches: RecordedSearch[] = [];
    server.use(recordSearches(searches));
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} historyChips />);

    expect(screen.getByRole('heading', { name: 'Recherches récentes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rechercher « matrix »' }));

    expect(screen.getByRole('searchbox', { name: 'Chercher un film' })).toHaveValue('matrix');
    await waitFor(() => expect(searches.map((x) => x.q)).toEqual(['matrix']));
  });

  it('does not remember a search that found nothing', async () => {
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
    renderWithLocale(<AddMovieForm onAddItem={onAddItem} onAdded={onAdded} />);
    await user.type(screen.getByRole('searchbox', { name: 'Chercher un film' }), 'xqzjwv');

    expect(await screen.findByText(/aucun film ne correspond/i)).toBeInTheDocument();
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
  });
});
