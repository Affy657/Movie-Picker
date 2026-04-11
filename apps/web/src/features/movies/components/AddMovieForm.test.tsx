import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { LocaleProvider } from '@/shared/i18n';
import AddMovieForm from '@/features/movies/components/AddMovieForm';
import { TEST_API_V1, createSearchAndAddHandlers } from '@/mocks/handlers';
import { http, HttpResponse } from 'msw';

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('AddMovieForm (MSW)', () => {
  const slug = 'evt-add';
  const onAdded = vi.fn();

  const server = setupServer(...createSearchAndAddHandlers(slug));

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('recherche TMDB puis ajoute le film sélectionné', async () => {
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);

    await user.type(screen.getByPlaceholderText(/rechercher un film/i), 'Inception');
    await user.click(screen.getByRole('button', { name: /^rechercher$/i }));

    await waitFor(() => expect(screen.getByText(/film test/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));

    await waitFor(() => expect(onAdded).toHaveBeenCalled());
  });

  it('affiche une erreur si la recherche échoue', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({ error: 'TMDB down' }, { status: 503 })
      )
    );
    const user = userEvent.setup();
    renderWithLocale(<AddMovieForm slug={slug} participantId="p1" onAdded={onAdded} />);
    await user.type(screen.getByPlaceholderText(/rechercher un film/i), 'x');
    await user.click(screen.getByRole('button', { name: /^rechercher$/i }));
    await waitFor(() => expect(screen.getByText(/TMDB down|503/i)).toBeInTheDocument());
  });
});
