import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, createListJoinHandlers, TEST_API_V1 } from '@/mocks/handlers';
import JoinListPage from './JoinListPage';

const authedAlice = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
  })
);

const PREVIEW = {
  name: 'Ciné du dimanche',
  owner: { handle: 'lea', displayName: 'Léa Moreau', avatarId: '' },
  itemCount: 14,
  posterPaths: ['/a.jpg', '/b.jpg'],
  isFull: false,
  role: null,
  listId: null,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderPage(token = 'tok') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[`/l/${token}/rejoindre`]}>
        <Routes>
          <Route path="/l/:token/rejoindre" element={<JoinListPage />} />
          <Route path="/listes/:listId" element={<p>Page de la liste</p>} />
          <Route path="/login" element={<p>Connexion</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('JoinListPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows a visitor what the list holds, and asks them to sign in to join', async () => {
    server.use(authMeGuestHandler, ...createListJoinHandlers('tok', PREVIEW));
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ciné du dimanche' })
    ).toBeInTheDocument();
    expect(screen.getByText('Léa vous invite à rejoindre cette liste.')).toBeInTheDocument();
    expect(screen.getByText('14 films')).toBeInTheDocument();
    expect(
      Array.from(document.querySelectorAll('img'), (image) => image.getAttribute('src'))
    ).toEqual([expect.stringContaining('/a.jpg'), expect.stringContaining('/b.jpg')]);
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent('/l/tok/rejoindre')}`
    );
    expect(screen.queryByRole('button', { name: 'Rejoindre la liste' })).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex'
    );
  });

  it('lets a signed-in person join, then opens the list', async () => {
    server.use(
      authedAlice,
      ...createListJoinHandlers('tok', PREVIEW, { id: 'l9', name: 'Ciné du dimanche' })
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Rejoindre la liste' }));

    expect(await screen.findByText('Page de la liste')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/listes/l9');
  });

  it('says the list filled up between the invitation and the click, and stays on the page', async () => {
    server.use(
      authedAlice,
      http.post(`${TEST_API_V1}/lists/join/tok`, () =>
        HttpResponse.json(
          {
            error: 'full',
            code: 409,
            reason: 'list_members_limit_reached',
            params: { max: 20 },
          },
          { status: 409 }
        )
      ),
      ...createListJoinHandlers('tok', PREVIEW)
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Rejoindre la liste' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette liste réunit déjà 20 personnes, invitations en attente comprises.'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/l/tok/rejoindre');
    expect(screen.getByRole('button', { name: 'Rejoindre la liste' })).toBeEnabled();
  });

  it('says the link stopped working when it is turned off between the preview and the click', async () => {
    server.use(
      authedAlice,
      http.post(`${TEST_API_V1}/lists/join/tok`, () =>
        HttpResponse.json(
          { error: 'invalid', code: 404, reason: 'list_invite_link_invalid' },
          { status: 404 }
        )
      ),
      ...createListJoinHandlers('tok', PREVIEW)
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Rejoindre la liste' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce lien d’invitation n’est plus valable. Demandez-en un nouveau au créateur de la liste.'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/l/tok/rejoindre');
  });

  it('goes straight to the list when the person is already in it', async () => {
    server.use(
      authedAlice,
      ...createListJoinHandlers('tok', { ...PREVIEW, role: 'member', listId: 'l9' })
    );
    renderPage();

    expect(await screen.findByText('Page de la liste')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/listes/l9');
  });

  it('says the list is full, without a way to join', async () => {
    server.use(authedAlice, ...createListJoinHandlers('tok', { ...PREVIEW, isFull: true }));
    renderPage();

    expect(await screen.findByText('Cette liste est complète')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Elle réunit déjà le nombre maximum de personnes. Demandez à Léa de faire de la place.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejoindre la liste' })).toBeNull();
  });

  it('says plainly when the link no longer works', async () => {
    server.use(authMeGuestHandler, ...createListJoinHandlers('perime', null));
    renderPage('perime');

    expect(
      await screen.findByRole('heading', { name: 'Ce lien d’invitation n’est plus valable' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/');
  });
});
