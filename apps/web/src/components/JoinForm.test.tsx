import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinForm from './JoinForm';
import { AppTestProviders } from '../test-utils/queryWrapper';
import { ApiError } from '../api/apiError';
import type { UserProfile } from '../types/auth';

const mockFetchApi = vi.fn();
const mockSetStoredParticipant = vi.fn();
vi.mock('../api/client', () => ({ fetchApi: (...args: unknown[]) => mockFetchApi(...args) }));
vi.mock('../types/event', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../types/event')>();
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

  it('affiche le champ pseudo et le bouton Rejoindre', () => {
    render(
      <AppTestProviders>
        <JoinForm slug="soiree" onJoined={onJoined} />
      </AppTestProviders>
    );
    expect(screen.getByRole('heading', { name: /rejoindre la soirée/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/alice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
  });

  it('préremplit le pseudo depuis le compte connecté', async () => {
    const profile: UserProfile = {
      userId: 'u1',
      displayName: 'ProfilCompte',
      emailMasked: 'e***@***',
      uiTheme: 'system',
    };
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return profile;
      throw new Error(`fetchApi inattendu: ${path}`);
    });
    render(
      <AppTestProviders>
        <JoinForm slug="soiree" onJoined={onJoined} />
      </AppTestProviders>
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/pseudo/i)).toHaveValue('ProfilCompte');
    });
    expect(screen.getByText(/prérempli depuis votre compte/i)).toBeInTheDocument();
  });

  it('soumission appelle l’API join et onJoined', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/auth/me') throw new ApiError('Non authentifié', { code: 401 });
      if (path === '/events/soiree/join') return { _id: 'p1', eventId: 'e1', pseudo: 'Alice' };
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
});
