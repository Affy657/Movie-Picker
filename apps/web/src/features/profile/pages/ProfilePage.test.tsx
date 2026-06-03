import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

const ALICE_PROFILE = {
  handle: 'alice',
  displayName: 'Alice',
  avatarId: 'alpha',
  bio: 'Grande cinéphile',
  memberSince: '2024-03-15T00:00:00Z',
  followingCount: 3,
  followersCount: 7,
  isFollowedByMe: null,
};

const ME_PROFILE = {
  userId: 'u-me',
  displayName: 'Moi',
  emailMasked: 'm***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  avatarId: '',
  handle: 'moi',
  bio: null,
  isProfilePublic: true,
};

function renderProfile(handle: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[`/u/${handle}`]}>
        <Routes>
          <Route path="/u/:handle" element={<ProfilePage />} />
          <Route path="/" element={<div data-testid="route-home" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfilePage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le profil public (pseudo, handle, bio, membre depuis)', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Grande cinéphile')).toBeInTheDocument();
    expect(screen.getByText(/membre depuis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copier le lien/i })).toBeInTheDocument();
  });

  it('affiche les compteurs following/followers cliquables', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(await screen.findByRole('button', { name: /3.*abonnements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /7.*abonnés/i })).toBeInTheDocument();
  });

  it("ouvre la modal following au clic sur le compteur d'abonnements", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/following`, () =>
        HttpResponse.json({ items: [] })
      )
    );

    renderProfile('alice');
    await screen.findByRole('heading', { name: 'Alice' });

    await user.click(screen.getByRole('button', { name: /3.*abonnements/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it("ouvre la modal followers au clic sur le compteur d'abonnés", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/followers`, () =>
        HttpResponse.json({ items: [] })
      )
    );

    renderProfile('alice');
    await screen.findByRole('heading', { name: 'Alice' });

    await user.click(screen.getByRole('button', { name: /7.*abonnés/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('affiche le bouton Suivre quand connecté sur un profil tiers', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isFollowedByMe: false })
      )
    );

    renderProfile('alice');

    expect(await screen.findByRole('button', { name: /suivre/i })).toBeInTheDocument();
  });

  it('affiche le bouton Ne plus suivre quand déjà suivi', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isFollowedByMe: true })
      )
    );

    renderProfile('alice');

    expect(await screen.findByRole('button', { name: /ne plus suivre/i })).toBeInTheDocument();
  });

  it("n'affiche pas de bouton Suivre sur son propre profil", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, handle: 'moi', displayName: 'Moi', isFollowedByMe: null })
      )
    );

    renderProfile('moi');

    await screen.findByRole('heading', { name: 'Moi' });
    expect(screen.queryByRole('button', { name: /suivre/i })).not.toBeInTheDocument();
  });

  it("affiche un état introuvable quand l'API renvoie 404", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/ghost`, () =>
        HttpResponse.json({ error: 'Profil introuvable' }, { status: 404 })
      )
    );

    renderProfile('ghost');

    await waitFor(() => {
      expect(screen.getByText(/n'existe pas ou n'est pas public/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'ghost' })).not.toBeInTheDocument();
  });

  it('masque la bio quand elle est absente', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/bob`, () =>
        HttpResponse.json({
          handle: 'bob',
          displayName: 'Bob',
          avatarId: '',
          bio: null,
          memberSince: '2025-01-01T00:00:00Z',
          followingCount: 0,
          followersCount: 0,
          isFollowedByMe: null,
        })
      )
    );

    renderProfile('bob');

    expect(await screen.findByRole('heading', { name: 'Bob' })).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
  });
});
