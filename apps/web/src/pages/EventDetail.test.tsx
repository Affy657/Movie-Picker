import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import EventDetail from './EventDetail';
import { AppTestProviders } from '../test-utils/queryWrapper';
import {
  TEST_API_V1,
  authMeGuestHandler,
  createEventDetailHandlers,
  createJoinHandler,
  createSearchAndAddHandlers,
} from '../mocks/handlers';
import { http, HttpResponse } from 'msw';
import { pageTitle } from '../hooks/useDocumentTitle';

function renderEventDetail(initialPath: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/s/:slug" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('EventDetail (MSW)', () => {
  const slug = 'soiree-msw';

  const server = setupServer(
    authMeGuestHandler,
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
      http.get(`${TEST_API_V1}/events/slug/:s`, () =>
        HttpResponse.json({ error: 'introuvable' }, { status: 404 })
      ),
      http.get(`${TEST_API_V1}/events/:s/movies`, () => HttpResponse.json([]))
    );
    renderEventDetail(`/s/inconnu`);
    await waitFor(() => {
      expect(screen.getByText(/n'existe pas|introuvable/i)).toBeInTheDocument();
    });
    expect(document.title).toBe(pageTitle('Soirée introuvable'));
  });

  it('affiche le lien invité et le QR pour un simple participant (sans token hôte)', async () => {
    renderEventDetail(`/s/${slug}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    expect(screen.getByText('Lien à partager')).toBeInTheDocument();
    expect(screen.getByText('QR code invitation')).toBeInTheDocument();
    expect(screen.queryByText('Votre lien hôte (ne pas partager)')).not.toBeInTheDocument();
  });

  it('en tant qu’hôte affiche les deux liens de partage', async () => {
    const token = 'host-secret-token';
    renderEventDetail(`/s/${slug}?host=${encodeURIComponent(token)}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    expect(document.title).toBe(pageTitle('Soirée démo'));
    expect(screen.getByText('Lien à partager')).toBeInTheDocument();
    expect(screen.getByText('Votre lien hôte (ne pas partager)')).toBeInTheDocument();
  });

  it('en tant qu’hôte affiche le bandeau thème et le panneau paramètres', async () => {
    const token = 'host-secret-token';
    server.use(
      ...createEventDetailHandlers({ slug, title: 'Soirée démo', theme: 'Comédie noire' }),
      createJoinHandler(slug),
      ...createSearchAndAddHandlers(slug)
    );
    renderEventDetail(`/s/${slug}?host=${encodeURIComponent(token)}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    expect(screen.getByText('Comédie noire')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Thème de soirée/i })).toBeInTheDocument();
    expect(screen.getByText('Paramètres de la soirée')).toBeInTheDocument();
  });

  it('affiche erreur films + Réessayer si le chargement des films échoue', async () => {
    server.use(
      http.get(`${TEST_API_V1}/events/:slug/movies`, () =>
        HttpResponse.json({ error: 'Service indisponible' }, { status: 503 })
      )
    );
    renderEventDetail(`/s/${slug}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/indisponible|Service/i)).toBeInTheDocument();
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
