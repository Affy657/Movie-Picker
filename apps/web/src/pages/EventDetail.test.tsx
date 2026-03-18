import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import EventDetail from './EventDetail';
import {
  TEST_API_BASE,
  createEventDetailHandlers,
  createJoinHandler,
  createSearchAndAddHandlers,
} from '../mocks/handlers';
import { http, HttpResponse } from 'msw';

function renderEventDetail(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/s/:slug" element={<EventDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EventDetail (MSW)', () => {
  const slug = 'soiree-msw';

  const server = setupServer(
    ...createEventDetailHandlers({ slug, title: 'Soirée démo' }),
    createJoinHandler(slug),
    ...createSearchAndAddHandlers(slug)
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  it('affiche une erreur si la soirée est introuvable (404)', async () => {
    server.use(
      http.get(`${TEST_API_BASE}/events/slug/:s`, () =>
        HttpResponse.json({ error: 'introuvable' }, { status: 404 })
      ),
      http.get(`${TEST_API_BASE}/events/:s/movies`, () => HttpResponse.json([]))
    );
    renderEventDetail(`/s/inconnu`);
    await waitFor(() => {
      expect(screen.getByText(/n'existe pas|introuvable/i)).toBeInTheDocument();
    });
  });

  it('en tant qu’hôte affiche les deux liens de partage', async () => {
    const token = 'host-secret-token';
    renderEventDetail(`/s/${slug}?host=${encodeURIComponent(token)}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    expect(screen.getByText('Lien à partager')).toBeInTheDocument();
    expect(screen.getByText('Votre lien hôte (ne pas partager)')).toBeInTheDocument();
  });

  it('après rejoindre, affiche la section Films et permet de proposer un film', async () => {
    const user = userEvent.setup();
    renderEventDetail(`/s/${slug}`);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /rejoindre/i })).toBeInTheDocument()
    );
    await user.type(screen.getByLabelText(/pseudo/i), 'Bob');
    await user.click(screen.getByRole('button', { name: /rejoindre/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^films$/i })).toBeInTheDocument()
    );
    await user.type(screen.getByPlaceholderText(/rechercher un film/i), 'Test');
    await user.click(screen.getByRole('button', { name: /^rechercher$/i }));
    await waitFor(() => expect(screen.getByText(/film test/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    await waitFor(() => expect(screen.queryByText(/film test/i)).not.toBeInTheDocument());
  });
});
