import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import FollowListModal from '@/features/profile/components/FollowListModal';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

function renderModal(
  overrides: Partial<Parameters<typeof FollowListModal>[0]> = {},
  onClose = vi.fn()
) {
  const props = {
    handle: 'alice',
    initialTab: 'following' as const,
    followingCount: 2,
    followersCount: 5,
    onClose,
    ...overrides,
  };
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <FollowListModal {...props} />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('FollowListModal (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche les deux onglets avec compteurs', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] }))
    );

    renderModal();

    expect(await screen.findByRole('button', { name: /2 abonnements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /5 abonnés/i })).toBeInTheDocument();
  });

  it("affiche 'Aucun utilisateur' quand la liste est vide", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] }))
    );

    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/aucun utilisateur/i)).toBeInTheDocument();
    });
  });

  it('affiche les utilisateurs dans la liste', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () =>
        HttpResponse.json({
          items: [{ handle: 'bob', displayName: 'Bob', avatarId: '', isFollowedByMe: null }],
        })
      )
    );

    renderModal();

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
  });

  it("bascule vers l'onglet Followers au clic", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] })),
      http.get(`${TEST_API_V1}/users/alice/followers`, () =>
        HttpResponse.json({
          items: [{ handle: 'carol', displayName: 'Carol', avatarId: '', isFollowedByMe: null }],
        })
      )
    );

    renderModal();
    await screen.findByText(/aucun utilisateur/i);

    await user.click(screen.getByRole('button', { name: /5 abonnés/i }));

    expect(await screen.findByText('Carol')).toBeInTheDocument();
  });

  it('appelle onClose quand on clique sur la croix', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] }))
    );

    renderModal({}, onClose);
    await screen.findByRole('button', { name: /fermer/i });

    await user.click(screen.getByRole('button', { name: /fermer/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('s’ouvre en modale native et se ferme sur l’événement close (Échap)', async () => {
    const onClose = vi.fn();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] }))
    );

    renderModal({}, onClose);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('open');

    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('affiche un badge "Vous" et aucun bouton pour sa propre ligne', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u-bob',
          displayName: 'Bob',
          emailMasked: 'b***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
          avatarId: '',
          handle: 'bob',
          bio: null,
          isProfilePublic: true,
        })
      ),
      http.get(`${TEST_API_V1}/users/alice/following`, () =>
        HttpResponse.json({
          items: [{ handle: 'bob', displayName: 'Bob', avatarId: '', isFollowedByMe: null }],
        })
      )
    );

    renderModal();

    expect(await screen.findByText('Vous')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suivre/i })).not.toBeInTheDocument();
  });

  it('bascule en feuille (Sheet) sous 768px', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    try {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] }))
      );

      renderModal();

      expect(await screen.findByRole('heading', { name: 'Abonnements' })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("démarre sur l'onglet Followers si initialTab='followers'", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/followers`, () => HttpResponse.json({ items: [] }))
    );

    renderModal({ initialTab: 'followers' });

    await waitFor(() => {
      expect(screen.getByText(/aucun utilisateur/i)).toBeInTheDocument();
    });
  });

  it("affiche l'invitation a chercher sur l'onglet Rechercher", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] }))
    );

    renderModal();
    await screen.findByText(/aucun utilisateur/i);

    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(await screen.findByText('Cherchez un pseudo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Pseudo ou @handle')).toBeInTheDocument();
  });

  it('demande deux caracteres avant de lancer la recherche', async () => {
    const user = userEvent.setup();
    const searchCalls: string[] = [];
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] })),
      http.get(`${TEST_API_V1}/users/search`, ({ request }) => {
        searchCalls.push(new URL(request.url).searchParams.get('q') ?? '');
        return HttpResponse.json({ items: [] });
      })
    );

    renderModal();
    await screen.findByText(/aucun utilisateur/i);
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    await user.type(screen.getByPlaceholderText('Pseudo ou @handle'), 'm');

    expect(await screen.findByText('Tapez au moins 2 caractères.')).toBeInTheDocument();
    expect(searchCalls).toEqual([]);
  });

  it('surligne la portion trouvee dans le pseudo et le handle', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] })),
      http.get(`${TEST_API_V1}/users/search`, () =>
        HttpResponse.json({
          items: [
            { handle: 'lea_m', displayName: 'Léa Moreau', avatarId: '', isFollowedByMe: false },
            {
              handle: 'sofiamorgane',
              displayName: 'Sofia Benali',
              avatarId: '',
              isFollowedByMe: true,
            },
          ],
        })
      )
    );

    renderModal();
    await screen.findByText(/aucun utilisateur/i);
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    await user.type(screen.getByPlaceholderText('Pseudo ou @handle'), 'mor');

    expect(await screen.findByText('Sofia Benali')).toBeInTheDocument();
    const highlights = document.querySelectorAll('mark');
    expect([...highlights].map((mark) => mark.textContent)).toEqual(['Mor', 'mor']);
  });

  it('propose de suivre un compte trouve qui ne l est pas encore', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u-alice',
          displayName: 'Alice',
          emailMasked: 'a***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
          avatarId: '',
          handle: 'alice',
          bio: null,
          isProfilePublic: true,
        })
      ),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] })),
      http.get(`${TEST_API_V1}/users/search`, () =>
        HttpResponse.json({
          items: [
            { handle: 'lea_m', displayName: 'Léa Moreau', avatarId: '', isFollowedByMe: false },
          ],
        })
      )
    );

    renderModal();
    await screen.findByText(/aucun utilisateur/i);
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    await user.type(screen.getByPlaceholderText('Pseudo ou @handle'), 'mor');

    expect(await screen.findByRole('button', { name: 'Suivre @lea_m' })).toBeInTheDocument();
  });

  it('explique une recherche sans resultat', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] })),
      http.get(`${TEST_API_V1}/users/search`, () => HttpResponse.json({ items: [] }))
    );

    renderModal();
    await screen.findByText(/aucun utilisateur/i);
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    await user.type(screen.getByPlaceholderText('Pseudo ou @handle'), 'zephyrin');

    expect(await screen.findByText('Personne ne correspond')).toBeInTheDocument();
    expect(screen.getByText(/profil est privé/i)).toBeInTheDocument();
  });

  it('reduit l onglet Rechercher a une loupe sur mobile sans toucher aux compteurs', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    try {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] }))
      );

      renderModal();

      expect(
        await screen.findByRole('button', { name: 'Rechercher des utilisateurs' })
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Rechercher' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /2 abonnements/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /5 abonnés/i })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
