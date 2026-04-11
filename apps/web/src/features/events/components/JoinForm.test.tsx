import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('JoinForm', () => {
  const onJoined = vi.fn();

  beforeEach(() => {
    mockFetchApi.mockReset();
    mockSetStoredParticipant.mockReset();
    onJoined.mockReset();
    mockFetchApi.mockImplementation(guestAuthImpl);
  });

  it('affiche le champ pseudo et le bouton Rejoindre (invité)', () => {
    render(
      <AppTestProviders>
        <JoinForm slug="soiree" onJoined={onJoined} />
      </AppTestProviders>
    );
    expect(screen.getByRole('heading', { name: /rejoindre la soirée/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/alice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
  });

  it('connecté : pas de champ pseudo, Rejoindre envoie le displayName du compte', async () => {
    const user = userEvent.setup();
    const profile: UserProfile = {
      userId: 'u1',
      displayName: 'ProfilCompte',
      emailMasked: 'e***@***',
      uiTheme: 'system',
    };
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
    render(
      <AppTestProviders>
        <JoinForm slug="soiree" onJoined={onJoined} />
      </AppTestProviders>
    );
    await waitFor(() => {
      expect(screen.queryByLabelText(/pseudo/i)).not.toBeInTheDocument();
    });
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

  it('soumission appelle l’API join et onJoined (invité)', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/auth/me') throw new ApiError('Non authentifié', { code: 401 });
      if (path === '/events/soiree/join')
        return {
          participant: { _id: 'p1', eventId: 'e1', pseudo: 'Alice' },
          isNew: true,
          message: '',
        };
      throw new Error(`fetchApi inattendu: ${path}`);
    });
    render(
      <AppTestProviders>
        <JoinForm slug="soiree" onJoined={onJoined} />
      </AppTestProviders>
    );
    await user.type(screen.getByPlaceholderText(/alice/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /rejoindre/i }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/events/soiree/join',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ pseudo: 'Alice' }),
        })
      );
    });
    await waitFor(() => {
      expect(mockSetStoredParticipant).toHaveBeenCalledWith('soiree', 'p1', 'Alice');
      expect(onJoined).toHaveBeenCalledWith('p1', 'Alice');
    });
  });

  it("affiche un message d'erreur si l'API join échoue", async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/auth/me') throw new ApiError('Non authentifié', { code: 401 });
      if (path === '/events/soiree/join') throw new ApiError('Soirée complète', { code: 403 });
      throw new Error(`fetchApi inattendu: ${path}`);
    });
    render(
      <AppTestProviders>
        <JoinForm slug="soiree" onJoined={onJoined} />
      </AppTestProviders>
    );
    await user.type(screen.getByPlaceholderText(/alice/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /rejoindre/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/soirée complète/i);
    });
    expect(onJoined).not.toHaveBeenCalled();
  });
});
