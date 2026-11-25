import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import avatarStyles from '@/shared/components/Avatar.module.css';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { EventParticipantSummary } from '@/shared/types/event';

const participants: EventParticipantSummary[] = [
  { id: 'p-creator', pseudo: 'Hôte', isCreator: true },
  { id: 'p-me', pseudo: 'Moi', isCreator: false },
  { id: 'p-other', pseudo: 'Bob', isCreator: false },
];

function renderList(props: Partial<Parameters<typeof EventParticipantsList>[0]> = {}) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <EventParticipantsList participants={participants} currentParticipantId="p-me" {...props} />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('EventParticipantsList', () => {
  it('names who is online and who is proposing a movie for assistive technologies', () => {
    renderList({
      onlineIds: new Set(['p-creator', 'p-other']),
      proposingIds: new Set(['p-other']),
    });

    const host = screen.getByTestId('participant-p-creator');
    const me = screen.getByTestId('participant-p-me');
    const bob = screen.getByTestId('participant-p-other');
    expect(host).toHaveTextContent('en ligne');
    expect(me).not.toHaveTextContent('en ligne');
    expect(bob).toHaveTextContent('propose un film…');
    expect(host).not.toHaveTextContent('propose un film…');
  });

  it('draws a halo around the avatar of whoever is proposing a movie', () => {
    renderList({
      onlineIds: new Set(['p-creator', 'p-other']),
      proposingIds: new Set(['p-other']),
    });

    expect(
      screen.getByTestId('participant-p-other').querySelector(`.${avatarStyles.halo}`)
    ).not.toBeNull();
    expect(
      screen.getByTestId('participant-p-creator').querySelector(`.${avatarStyles.halo}`)
    ).toBeNull();
  });

  it('rings the avatar of each member in their own colour, a guest without account getting none', () => {
    renderList({
      participants: [
        { id: 'p-lea', pseudo: 'Léa', isCreator: true, accentColor: 'pink' },
        { id: 'p-guest', pseudo: 'Invité', isCreator: false, accentColor: null },
      ],
      currentParticipantId: 'p-guest',
    });

    expect(screen.getByTestId('participant-p-lea').querySelector('.accent-pink')).not.toBeNull();
    expect(
      screen.getByTestId('participant-p-guest').querySelector('[class*="accent-"]')
    ).toBeNull();
  });

  it('shows no presence marker while presence is unknown', () => {
    renderList();

    expect(screen.queryByText('en ligne')).not.toBeInTheDocument();
  });

  it('lists every participant with the crown of the host and the badge of the viewer', () => {
    renderList();

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(screen.getByTestId('participant-p-creator')).getByLabelText('hôte')
    ).toBeVisible();
    expect(within(screen.getByTestId('participant-p-me')).getByText('Vous')).toBeInTheDocument();
    expect(within(screen.getByTestId('participant-p-other')).queryByText('Vous')).toBeNull();
  });

  it('shows neither a count, a full badge nor a manage mode', () => {
    renderList({ isHost: true, onRemoveParticipant: vi.fn() });

    expect(screen.queryByText(/complète/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gérer' })).not.toBeInTheDocument();
  });

  it('shows no remove button when the user is not the host', () => {
    renderList({ isHost: false, onRemoveParticipant: vi.fn() });

    expect(screen.queryByTestId('remove-participant-p-other')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-participant-p-creator')).not.toBeInTheDocument();
  });

  it('host: removes another participant from their row, but neither the creator nor themselves', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderList({ isHost: true, onRemoveParticipant: onRemove });

    expect(screen.queryByTestId('remove-participant-p-creator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-participant-p-me')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retirer Bob de la soirée' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('p-other', 'Bob');
  });

  it('disables the button of the participant being removed', () => {
    renderList({ isHost: true, pendingRemovalId: 'p-other', onRemoveParticipant: vi.fn() });

    expect(screen.getByTestId('remove-participant-p-other')).toBeDisabled();
  });

  it('links the avatar and the name of a participant to their profile when they have a handle', () => {
    renderList({
      participants: [{ id: 'p1', pseudo: 'Alice', handle: 'alice' }],
      currentParticipantId: null,
    });

    const link = screen.getByRole('link', { name: /voir le profil d’alice/i });
    expect(link).toHaveAttribute('href', '/u/alice');
  });

  it('names the presence of a participant inside the link to the profile', () => {
    renderList({
      participants: [
        { id: 'p1', pseudo: 'Alice', handle: 'alice' },
        { id: 'p2', pseudo: 'Bob', handle: 'bob' },
        { id: 'p3', pseudo: 'Chloé', handle: 'chloe' },
      ],
      currentParticipantId: null,
      onlineIds: new Set(['p1', 'p2']),
      proposingIds: new Set(['p2']),
    });

    expect(screen.getByRole('link', { name: 'Voir le profil d’Alice, en ligne' })).toHaveAttribute(
      'href',
      '/u/alice'
    );
    expect(
      screen.getByRole('link', { name: 'Voir le profil de Bob, propose un film…' })
    ).toHaveAttribute('href', '/u/bob');
    expect(screen.getByRole('link', { name: 'Voir le profil de Chloé' })).toHaveAttribute(
      'href',
      '/u/chloe'
    );
  });

  it('names the host and yourself inside the link to the profile, with the presence', () => {
    renderList({
      participants: [
        { id: 'p-host', pseudo: 'Adrien', handle: 'adrien', isCreator: true },
        { id: 'p-me', pseudo: 'Alice', handle: 'alice' },
      ],
      currentParticipantId: 'p-me',
      onlineIds: new Set(['p-host', 'p-me']),
    });

    expect(
      screen.getByRole('link', { name: 'Voir le profil d’Adrien, hôte, en ligne' })
    ).toHaveAttribute('href', '/u/adrien');
    expect(
      screen.getByRole('link', { name: 'Voir le profil d’Alice, c’est vous, en ligne' })
    ).toHaveAttribute('href', '/u/alice');
  });

  it('renders no profile link for a participant without a handle', () => {
    renderList({
      participants: [{ id: 'p1', pseudo: 'Legacy', handle: null }],
      currentParticipantId: null,
    });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Legacy')).toBeInTheDocument();
  });

  it('says so when nobody has joined yet', () => {
    renderList({ participants: [], currentParticipantId: null });

    expect(screen.getByText('Personne n’a encore rejoint la soirée.')).toBeInTheDocument();
  });

  describe('co-hosts', () => {
    const night: EventParticipantSummary[] = [
      { id: 'p-creator', pseudo: 'Hôte', isCreator: true },
      { id: 'p-lea', pseudo: 'Léa', isCreator: false, isCoHost: true },
      { id: 'p-tom', pseudo: 'Tom', isCreator: false },
    ];

    it('marks every co-host for everyone', () => {
      renderList({ participants: night, currentParticipantId: 'p-tom' });

      expect(screen.getByTestId('participant-p-lea')).toHaveTextContent('Co-hôte');
      expect(screen.getByTestId('participant-p-tom')).not.toHaveTextContent('Co-hôte');
      expect(screen.queryByRole('button', { name: /co-hôte/ })).not.toBeInTheDocument();
    });

    it('lets the creator name or withdraw a co-host, never on their own row', async () => {
      const onToggleCoHost = vi.fn();
      renderList({
        participants: night,
        currentParticipantId: 'p-creator',
        isHost: true,
        viewerIsCreator: true,
        onRemoveParticipant: vi.fn(),
        onToggleCoHost,
      });

      expect(
        within(screen.getByTestId('participant-p-creator')).queryByRole('button')
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Nommer Tom co-hôte' }));
      await userEvent.click(
        screen.getByRole('button', { name: 'Retirer le rôle de co-hôte à Léa' })
      );

      expect(onToggleCoHost).toHaveBeenNthCalledWith(1, 'p-tom', true);
      expect(onToggleCoHost).toHaveBeenNthCalledWith(2, 'p-lea', false);
      expect(screen.getByRole('button', { name: 'Retirer Léa de la soirée' })).toBeInTheDocument();
    });

    it('lets a co-host remove a plain participant but neither the creator nor another co-host', () => {
      renderList({
        participants: [...night, { id: 'p-sam', pseudo: 'Sam', isCreator: false, isCoHost: true }],
        currentParticipantId: 'p-lea',
        isHost: true,
        onRemoveParticipant: vi.fn(),
      });

      expect(screen.getByRole('button', { name: 'Retirer Tom de la soirée' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Retirer Sam de la soirée' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Retirer Hôte de la soirée' })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /co-hôte/ })).not.toBeInTheDocument();
    });

    it('waits on the row whose role is changing', () => {
      renderList({
        participants: night,
        currentParticipantId: 'p-creator',
        isHost: true,
        viewerIsCreator: true,
        onToggleCoHost: vi.fn(),
        pendingCoHostId: 'p-tom',
      });

      expect(screen.getByRole('button', { name: 'Nommer Tom co-hôte' })).toBeDisabled();
    });
  });

  describe('people the host removed', () => {
    const removedPeople = [
      {
        id: 'u-lea',
        displayName: 'Léa',
        avatarId: 'avatar-4',
        handle: 'lea',
        accentColor: 'pink' as const,
      },
      {
        id: 'u-tom',
        displayName: 'Tom',
        avatarId: '',
        handle: null,
        accentColor: 'default' as const,
      },
    ];

    it('lists them apart from the participants, each with a way to let them back in', async () => {
      const user = userEvent.setup();
      const onLetBackIn = vi.fn();
      renderList({ isHost: true, removedPeople, onLetBackIn });

      const removed = screen.getByRole('list', { name: 'Retirés de la soirée' });
      expect(within(removed).getAllByRole('listitem')).toHaveLength(2);
      expect(within(screen.getByTestId('event-participants')).queryByText('Léa')).toBeNull();

      await user.click(within(removed).getByRole('button', { name: 'Laisser revenir Léa' }));

      expect(onLetBackIn).toHaveBeenCalledWith('u-lea', 'Léa');
    });

    it('still lists them when nobody is left in the night', () => {
      renderList({ isHost: true, participants: [], removedPeople, onLetBackIn: vi.fn() });

      expect(screen.getByText('Personne n’a encore rejoint la soirée.')).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Retirés de la soirée' })).toBeInTheDocument();
    });

    it('holds the button of the person being let back in', () => {
      renderList({
        isHost: true,
        removedPeople,
        onLetBackIn: vi.fn(),
        pendingLetBackInId: 'u-lea',
      });

      expect(screen.getByRole('button', { name: 'Laisser revenir Léa' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Laisser revenir Tom' })).toBeEnabled();
    });

    it('shows nothing of them without a way to let them back in', () => {
      renderList({ isHost: true, removedPeople });

      expect(screen.queryByRole('list', { name: 'Retirés de la soirée' })).toBeNull();
    });
  });
});
