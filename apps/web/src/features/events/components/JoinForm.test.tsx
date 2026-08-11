import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';
import JoinForm from '@/features/events/components/JoinForm';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { ApiError } from '@/shared/api/apiError';
import type { UserProfile } from '@/features/auth/types';

const mockFetchApi = vi.fn();
const mockSetStoredParticipant = vi.fn();
vi.mock('@/shared/api/client', () => ({ fetchApi: (...args: unknown[]) => mockFetchApi(...args) }));
vi.mock('@/features/events/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/events/storage')>();
  return {
    ...actual,
    setStoredParticipant: (...args: unknown[]) => mockSetStoredParticipant(...args),
  };
});

const guestAuthImpl = (path: string) => {
  if (path === '/auth/me') throw new ApiError('Non authentifié', { code: 401 });
  throw new Error(`fetchApi inattendu: ${path}`);
};

const profile: UserProfile = {
  userId: 'u1',
  displayName: 'ProfilCompte',
  emailMasked: 'e***@***',
  uiTheme: 'system',
  accentColor: 'default',
  ratingScale: 'five',
  avatarId: '',
  handle: 'profilcompte',
  bio: null,
  isProfilePublic: true,
  letterboxdUsername: null,
  letterboxdLastSyncAt: null,
  letterboxdLastSyncError: null,
};

function renderForm(node: ReactElement) {
  return render(
    <AppTestProviders>
      <MemoryRouter>{node}</MemoryRouter>
    </AppTestProviders>
  );
}

describe('JoinForm', () => {
  const onJoined = vi.fn();

  beforeEach(() => {
    mockFetchApi.mockReset();
    mockSetStoredParticipant.mockReset();
    onJoined.mockReset();
    mockFetchApi.mockImplementation(guestAuthImpl);
  });

  it('non connecté : affiche les CTA connexion/inscription, pas de champ pseudo ni bouton Rejoindre', async () => {
    renderForm(<JoinForm slug="soiree" onJoined={onJoined} />);
    expect(screen.getByRole('heading', { name: /rejoindre la soirée/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /se connecter/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /créer un compte/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/alice/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rejoindre/i })).not.toBeInTheDocument();
  });

  it('connecté : pas de champ pseudo, Rejoindre envoie le displayName du compte', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return profile;
      if (path === '/events/soiree/join')
        return {
          participant: { _id: 'p1', eventId: 'e1', pseudo: 'ProfilCompte' },
          isNew: true,
          message: '',
        };
      throw new Error(`fetchApi inattendu: ${path}`);
    });
    renderForm(<JoinForm slug="soiree" onJoined={onJoined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText(/alice/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /rejoindre/i }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/events/soiree/join',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ pseudo: 'ProfilCompte' }),
        })
      );
    });
    await waitFor(() => {
      expect(mockSetStoredParticipant).toHaveBeenCalledWith('soiree', 'p1', 'ProfilCompte');
      expect(onJoined).toHaveBeenCalledWith('p1', 'ProfilCompte');
    });
  });

  it('connecté sans displayName : envoie « Participant » par défaut', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return { ...profile, displayName: '   ' };
      if (path === '/events/soiree/join')
        return {
          participant: { _id: 'p1', eventId: 'e1', pseudo: 'Participant' },
          isNew: true,
          message: '',
        };
      throw new Error(`fetchApi inattendu: ${path}`);
    });
    renderForm(<JoinForm slug="soiree" onJoined={onJoined} />);
    await user.click(await screen.findByRole('button', { name: /rejoindre/i }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/events/soiree/join',
        expect.objectContaining({ body: JSON.stringify({ pseudo: 'Participant' }) })
      );
    });
  });

  it('affiche un message dédié et cache le formulaire quand la soirée est complète', () => {
    renderForm(<JoinForm slug="soiree" onJoined={onJoined} isFull maxParticipants={4} />);
    expect(screen.getByText(/complète \(4 participants maximum\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rejoindre/i })).not.toBeInTheDocument();
  });

  it("connecté : affiche un message d'erreur si l'API join échoue", async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return profile;
      if (path === '/events/soiree/join') throw new ApiError('Soirée complète', { code: 403 });
      throw new Error(`fetchApi inattendu: ${path}`);
    });
    renderForm(<JoinForm slug="soiree" onJoined={onJoined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /rejoindre/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/soirée complète/i);
    });
    expect(onJoined).not.toHaveBeenCalled();
  });
});
