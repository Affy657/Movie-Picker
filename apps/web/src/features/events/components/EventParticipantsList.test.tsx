import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { EventParticipantSummary } from '@/shared/types/event';

const participants: EventParticipantSummary[] = [
  { id: 'p-creator', pseudo: 'Hôte', isCreator: true },
  { id: 'p-me', pseudo: 'Moi', isCreator: false },
  { id: 'p-other', pseudo: 'Bob', isCreator: false },
];

describe('EventParticipantsList', () => {
  it('affiche les participants, le badge hôte et le compteur', () => {
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
    expect(screen.getByText('hôte')).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 5/)).toBeInTheDocument();
  });

  it("n'affiche aucun bouton retirer si l'utilisateur n'est pas hôte", () => {
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

  it("hôte : peut retirer les autres participants, mais pas le créateur ni soi-même", async () => {
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

    expect(screen.queryByTestId('remove-participant-p-creator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-participant-p-me')).not.toBeInTheDocument();

    const removeOther = screen.getByTestId('remove-participant-p-other');
    await user.click(removeOther);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('p-other', 'Bob');
  });

  it('désactive le bouton du participant en cours de retrait', () => {
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

    expect(screen.getByTestId('remove-participant-p-other')).toBeDisabled();
  });
});
