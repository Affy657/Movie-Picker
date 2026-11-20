import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { EventParticipantSummary } from '@/shared/types/event';

const participants: EventParticipantSummary[] = [
  { id: 'p-creator', pseudo: 'Hôte', isCreator: true },
  { id: 'p-me', pseudo: 'Moi', isCreator: false },
  { id: 'p-other', pseudo: 'Bob', isCreator: false },
];

describe('EventParticipantsList', () => {
  it('marks who is online and who is proposing a movie', () => {
    render(
      <AppTestProviders>
        <EventParticipantsList
          participants={participants}
          currentParticipantId="p-me"
          onlineIds={new Set(['p-creator', 'p-other'])}
          proposingIds={new Set(['p-other'])}
        />
      </AppTestProviders>
    );

    const host = screen.getByTestId('participant-p-creator');
    const me = screen.getByTestId('participant-p-me');
    const bob = screen.getByTestId('participant-p-other');
    expect(host).toHaveTextContent('en ligne');
    expect(me).not.toHaveTextContent('en ligne');
    expect(bob).toHaveTextContent('propose un film…');
    expect(host).not.toHaveTextContent('propose un film…');
  });

  it('rings the avatar of each member in their own colour, a guest without account getting none', () => {
    render(
      <AppTestProviders>
        <EventParticipantsList
          participants={[
            { id: 'p-lea', pseudo: 'Léa', isCreator: true, accentColor: 'pink' },
            { id: 'p-guest', pseudo: 'Invité', isCreator: false, accentColor: null },
          ]}
          currentParticipantId="p-guest"
        />
      </AppTestProviders>
    );

    expect(screen.getByTestId('participant-p-lea').querySelector('.accent-pink')).not.toBeNull();
    expect(
      screen.getByTestId('participant-p-guest').querySelector('[class*="accent-"]')
    ).toBeNull();
  });

  it('shows no presence marker while presence is unknown', () => {
    render(
      <AppTestProviders>
        <EventParticipantsList participants={participants} currentParticipantId="p-me" />
      </AppTestProviders>
    );

    expect(screen.queryByText('en ligne')).not.toBeInTheDocument();
  });

  it('shows the participants and the host badge', () => {
    render(
      <AppTestProviders>
        <EventParticipantsList
          participants={participants}
          currentParticipantId="p-me"
          maxParticipants={5}
        />
      </AppTestProviders>
    );

    expect(screen.getByText('Hôte')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByLabelText('hôte')).toBeInTheDocument();
  });

  it('shows no remove button when the user is not the host', () => {
    render(
      <AppTestProviders>
        <EventParticipantsList
          participants={participants}
          currentParticipantId="p-me"
          isHost={false}
          onRemoveParticipant={vi.fn()}
        />
      </AppTestProviders>
    );

    expect(screen.queryByTestId('remove-participant-p-other')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-participant-p-creator')).not.toBeInTheDocument();
  });

  it('host: can remove the other participants, but neither the creator nor themselves', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <AppTestProviders>
        <EventParticipantsList
          participants={participants}
          currentParticipantId="p-me"
          isHost
          onRemoveParticipant={onRemove}
        />
      </AppTestProviders>
    );

    expect(screen.queryByTestId('remove-participant-p-other')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('manage-participants-toggle'));

    expect(screen.queryByTestId('remove-participant-p-creator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-participant-p-me')).not.toBeInTheDocument();

    const removeOther = screen.getByTestId('remove-participant-p-other');
    await user.click(removeOther);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('p-other', 'Bob');
  });

  it('disables the button of the participant being removed', async () => {
    const user = userEvent.setup();
    render(
      <AppTestProviders>
        <EventParticipantsList
          participants={participants}
          currentParticipantId="p-me"
          isHost
          pendingRemovalId="p-other"
          onRemoveParticipant={vi.fn()}
        />
      </AppTestProviders>
    );

    await user.click(screen.getByTestId('manage-participants-toggle'));

    expect(screen.getByTestId('remove-participant-p-other')).toBeDisabled();
  });

  it("rend l'avatar du participant cliquable vers son profil quand un handle existe", () => {
    render(
      <AppTestProviders>
        <MemoryRouter>
          <EventParticipantsList
            participants={[{ id: 'p1', pseudo: 'Alice', handle: 'alice' }]}
            currentParticipantId={null}
          />
        </MemoryRouter>
      </AppTestProviders>
    );

    const link = screen.getByRole('link', { name: /voir le profil de alice/i });
    expect(link).toHaveAttribute('href', '/u/alice');
  });

  it('names the presence of a participant inside the link to the profile', () => {
    render(
      <AppTestProviders>
        <MemoryRouter>
          <EventParticipantsList
            participants={[
              { id: 'p1', pseudo: 'Alice', handle: 'alice' },
              { id: 'p2', pseudo: 'Bob', handle: 'bob' },
              { id: 'p3', pseudo: 'Chloé', handle: 'chloe' },
            ]}
            currentParticipantId={null}
            onlineIds={new Set(['p1', 'p2'])}
            proposingIds={new Set(['p2'])}
          />
        </MemoryRouter>
      </AppTestProviders>
    );

    expect(screen.getByRole('link', { name: 'Voir le profil de Alice, en ligne' })).toHaveAttribute(
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

  it('ne rend pas de lien profil pour un participant sans handle', () => {
    render(
      <AppTestProviders>
        <MemoryRouter>
          <EventParticipantsList
            participants={[{ id: 'p1', pseudo: 'Legacy', handle: null }]}
            currentParticipantId={null}
          />
        </MemoryRouter>
      </AppTestProviders>
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Legacy')).toBeInTheDocument();
  });
});
