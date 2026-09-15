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
  it('shows the participants, the host badge and the counter', () => {
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
    expect(screen.getByText(/3 \/ 5/)).toBeInTheDocument();
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
