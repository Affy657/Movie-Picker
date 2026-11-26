import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';
import JoinForm from '@/features/events/components/JoinForm';
import styles from '@/features/events/components/JoinForm.module.css';
import { promptToJoinEvent } from '@/features/events/joinPrompt';
import { JoinedAnnouncementContext } from '@/features/events/joinedAnnouncement';
import buttonStyles from '@/shared/components/Button.module.css';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { ApiError } from '@/shared/api/apiError';
import { buildUserProfile } from '@/test-utils/userProfile';

const mockFetchApi = vi.fn();
const mockSetStoredParticipant = vi.fn();
vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));
vi.mock('@/shared/utils/eventIdentityStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils/eventIdentityStorage')>();
  return {
    ...actual,
    setStoredParticipant: (...args: unknown[]) => mockSetStoredParticipant(...args),
  };
});

const guestAuthImpl = (path: string) => {
  if (path === '/auth/me') throw new ApiError('Non authentifié', { code: 401 });
  throw new Error(`fetchApi inattendu: ${path}`);
};

const profile = buildUserProfile({
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
  isWatchlistPublic: true,
  letterboxdUsername: null,
  letterboxdLastSyncAt: null,
  letterboxdLastSyncError: null,
  letterboxdPendingReconciliationCount: 0,
  hasPassword: true,
  linkedProviders: [],
});

const EVENT = {
  title: 'Soirée horreur',
  participants: [
    { id: 'p-host', pseudo: 'Léa Moreau', isCreator: true },
    { id: 'p2', pseudo: 'Sam', isCreator: false },
  ],
};

function joinResponder(isNew: boolean) {
  return async (path: string) => {
    if (path === '/auth/me') return profile;
    if (path === '/events/soiree/join')
      return {
        participant: { _id: 'p1', eventId: 'e1', pseudo: 'ProfilCompte' },
        isNew,
        message: '',
      };
    throw new Error(`fetchApi inattendu: ${path}`);
  };
}

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

  it('signed out: puts account creation first, and both ways come back to join the night', async () => {
    renderForm(<JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />);
    expect(screen.getByRole('heading', { name: /rejoindre la soirée/i })).toBeInTheDocument();
    const register = await screen.findByRole('link', { name: 'Créer un compte' });
    const login = screen.getByRole('link', { name: 'J’ai déjà un compte' });

    expect(register.compareDocumentPosition(login) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(register).toHaveClass(buttonStyles.primary!);
    expect(login).not.toHaveClass(buttonStyles.primary!);
    const joinOnReturn = encodeURIComponent('/e/soiree?rejoindre=1');
    expect(register).toHaveAttribute('href', `/register?returnTo=${joinOnReturn}`);
    expect(login).toHaveAttribute('href', `/login?returnTo=${joinOnReturn}`);
    expect(screen.queryByRole('link', { name: 'Se connecter' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/alice/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rejoindre/i })).not.toBeInTheDocument();
  });

  it('signed out: says who invites, to what, and what joining is for', async () => {
    renderForm(<JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />);

    expect(
      await screen.findByText('Léa Moreau vous invite à « Soirée horreur ».')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Chacun propose ses films et vote pour ceux des autres, puis la roue désigne le film de la soirée. Il suffit d’un compte pour participer.'
      )
    ).toBeInTheDocument();
  });

  it('still names the night when no participant is marked as its host', async () => {
    renderForm(
      <JoinForm
        slug="soiree"
        event={{ title: 'Soirée horreur', participants: [{ id: 'p2', pseudo: 'Sam' }] }}
        onJoined={onJoined}
      />
    );

    expect(await screen.findByText('On vous invite à « Soirée horreur ».')).toBeInTheDocument();
    expect(screen.queryByText(/Sam vous invite/)).not.toBeInTheDocument();
  });

  it('answers a vote attempt every time, even when the card is already on screen', async () => {
    renderForm(<JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />);
    const card = await screen.findByRole('region', { name: /rejoindre la soirée/i });
    const register = await within(card).findByRole('link', { name: 'Créer un compte' });
    expect(within(card).queryByText('Pour voter, rejoignez d’abord la soirée.')).toBeNull();

    act(() => promptToJoinEvent());

    expect(within(card).getByRole('status')).toHaveTextContent(
      'Pour voter, rejoignez d’abord la soirée.'
    );
    expect(card).toHaveClass(styles.prompted!);
    expect(register).toHaveFocus();
    const firstPulse = card.querySelector(`.${styles.pulse}`);
    expect(firstPulse).not.toBeNull();

    act(() => promptToJoinEvent());

    const secondPulse = card.querySelector(`.${styles.pulse}`);
    expect(secondPulse).not.toBeNull();
    expect(secondPulse).not.toBe(firstPulse);
    expect(within(card).getByRole('status')).toHaveTextContent(
      'Pour voter, rejoignez d’abord la soirée.'
    );
  });

  it('only highlights a full night when a vote is attempted, without asking to join', () => {
    renderForm(
      <JoinForm slug="soiree" event={EVENT} onJoined={onJoined} isFull maxParticipants={4} />
    );
    const card = screen.getByRole('region', { name: 'Soirée complète' });

    act(() => promptToJoinEvent());

    expect(card).toHaveClass(styles.prompted!);
    expect(within(card).queryByText('Pour voter, rejoignez d’abord la soirée.')).toBeNull();
  });

  it.each([
    ['J’ai déjà un compte', 'login'],
    ['Créer un compte', 'register'],
  ])('signed out: following %s counts the step once for this night', async (name, cta) => {
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/usage-counts') return undefined;
      return guestAuthImpl(path);
    });
    const user = userEvent.setup();
    renderForm(<JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />);
    const link = await screen.findByRole('link', { name });

    await user.click(link);
    await user.click(link);

    const counts = mockFetchApi.mock.calls.filter(([path]) => path === '/usage-counts');
    expect(counts).toHaveLength(1);
    expect(JSON.parse((counts[0]?.[1] as { body: string }).body)).toEqual({
      metric: 'join_prompt_clicked',
      variant: cta,
    });
  });

  it('signed in: no pseudo field, Join sends the account displayName', async () => {
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
    renderForm(<JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />);
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

  it('signed in: says who invites above the Join button', async () => {
    mockFetchApi.mockImplementation(joinResponder(true));
    renderForm(<JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />);

    await screen.findByRole('button', { name: /rejoindre/i });
    expect(screen.getByText('Léa Moreau vous invite à « Soirée horreur ».')).toBeInTheDocument();
    expect(
      screen.getByText('Rejoignez la soirée pour proposer des films et voter.')
    ).toBeInTheDocument();
  });

  it.each([
    [true, 1],
    [false, 0],
  ])(
    'signed in: a join that adds the account (%s) is announced to the page %i time',
    async (isNew, announcements) => {
      const user = userEvent.setup();
      const announce = vi.fn();
      mockFetchApi.mockImplementation(joinResponder(isNew));
      renderForm(
        <JoinedAnnouncementContext value={announce}>
          <JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />
        </JoinedAnnouncementContext>
      );

      await user.click(await screen.findByRole('button', { name: /rejoindre/i }));

      await waitFor(() => expect(onJoined).toHaveBeenCalledWith('p1', 'ProfilCompte'));
      expect(announce).toHaveBeenCalledTimes(announcements);
    }
  );

  it('signed in: joining marks my movie nights stale', async () => {
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
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.myEvents.active, { pages: [], pageParams: [] });
    render(
      <AppTestProviders client={client}>
        <MemoryRouter>
          <JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />
        </MemoryRouter>
      </AppTestProviders>
    );
    const joinButton = await screen.findByRole('button', { name: /rejoindre/i });
    expect(client.getQueryState(queryKeys.myEvents.active)?.isInvalidated).toBe(false);

    await user.click(joinButton);

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith('p1', 'ProfilCompte'));
    expect(client.getQueryState(queryKeys.myEvents.active)?.isInvalidated).toBe(true);
  });

  it('reloads the night after joining', async () => {
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
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.event.detail('soiree'), { slug: 'soiree' });
    render(
      <AppTestProviders client={client}>
        <MemoryRouter>
          <JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />
        </MemoryRouter>
      </AppTestProviders>
    );

    await user.click(await screen.findByRole('button', { name: /rejoindre/i }));

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith('p1', 'ProfilCompte'));
    expect(client.getQueryState(queryKeys.event.detail('soiree'))?.isInvalidated).toBe(true);
  });

  it('signed in without displayName: sends "Participant" by default', async () => {
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
    renderForm(<JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />);
    await user.click(await screen.findByRole('button', { name: /rejoindre/i }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/events/soiree/join',
        expect.objectContaining({ body: JSON.stringify({ pseudo: 'Participant' }) })
      );
    });
  });

  it('shows a dedicated message and hides the form when the movie night is full', () => {
    renderForm(
      <JoinForm slug="soiree" event={EVENT} onJoined={onJoined} isFull maxParticipants={4} />
    );
    expect(screen.getByRole('heading', { name: 'Soirée complète' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rejoindre la soirée' })).not.toBeInTheDocument();
    const message = screen.getByText(/complète \(4 participants maximum\)/i);
    expect(message).toBeInTheDocument();
    expect(message).not.toHaveAttribute('role', 'alert');
    expect(screen.queryByRole('button', { name: /rejoindre/i })).not.toBeInTheDocument();
  });

  it('signed in: shows an error message when the join API fails', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return profile;
      if (path === '/events/soiree/join') throw new ApiError('Soirée complète', { code: 403 });
      throw new Error(`fetchApi inattendu: ${path}`);
    });
    renderForm(<JoinForm slug="soiree" event={EVENT} onJoined={onJoined} />);
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
