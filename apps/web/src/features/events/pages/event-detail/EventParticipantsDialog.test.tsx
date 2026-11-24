import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import EventParticipantsDialog from '@/features/events/pages/event-detail/EventParticipantsDialog';
import type { ParticipantsPanelState } from '@/features/events/pages/event-detail/eventDetailSessionTypes';
import type { EventData } from '@/features/events/types';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubMatchMedia } from '@/test-utils/matchMedia';

const EVENT: EventData = {
  id: 'evt1',
  title: 'Soirée du vendredi',
  date: '2035-08-01',
  time: '20:30',
  slug: 'soiree-vendredi',
  isFinished: false,
  config: { maxParticipants: 8 },
  participants: [
    { id: 'p-host', pseudo: 'Adrien', isCreator: true },
    { id: 'p-alice', pseudo: 'Alice', isCreator: false },
  ],
} as EventData;

function panel(overrides: Partial<ParticipantsPanelState> = {}): ParticipantsPanelState {
  return {
    open: true,
    onClose: vi.fn(),
    pendingRemovalId: null,
    removePending: false,
    canShowLeave: false,
    canRemove: false,
    isConnectedSelf: false,
    onRemove: vi.fn(),
    onInviteFriends: vi.fn(),
    onLeave: vi.fn(),
    ...overrides,
  };
}

function renderDialog(event: EventData, state: ParticipantsPanelState, participantId: string) {
  render(
    <AppTestProviders>
      <MemoryRouter>
        <EventParticipantsDialog
          slug={event.slug}
          event={event}
          participant={{ participantId, pseudo: 'x' }}
          panel={state}
        />
      </MemoryRouter>
    </AppTestProviders>
  );
  return screen.getByRole('dialog', { name: 'Participants' });
}

describe('EventParticipantsDialog', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('is titled Participants, without any count or capacity, even when the night is full', () => {
    const full = { ...EVENT, isHost: true, config: { maxParticipants: 2 } } as EventData;
    const dialog = renderDialog(full, panel({ canRemove: true }), 'p-host');

    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(/^Participants$/);
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
    expect(dialog.textContent).not.toMatch(/\d/);
    expect(dialog).not.toHaveTextContent(/complet/i);
  });

  it('offers the host to copy the link and to invite friends', async () => {
    const user = userEvent.setup();
    const state = panel({ canRemove: true });
    const dialog = renderDialog({ ...EVENT, isHost: true }, state, 'p-host');

    expect(within(dialog).getByRole('button', { name: 'Copier le lien' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Inviter' }));

    expect(state.onInviteFriends).toHaveBeenCalledTimes(1);
    expect(within(dialog).queryByTestId('leave-event-button')).not.toBeInTheDocument();
  });

  it('lets a guest leave or copy the link, but not invite', async () => {
    const user = userEvent.setup();
    const state = panel({ canShowLeave: true });
    const dialog = renderDialog(EVENT, state, 'p-alice');

    expect(within(dialog).queryByRole('button', { name: 'Inviter' })).not.toBeInTheDocument();
    const leave = within(dialog).getByTestId('leave-event-button');
    expect(leave).toHaveAccessibleName('Quitter la soirée');
    expect(leave).toHaveTextContent('Quitter');
    await user.click(leave);

    expect(state.onLeave).toHaveBeenCalledTimes(1);
  });

  it('copies the link of the night and says so', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog(EVENT, panel(), 'p-alice');

    await user.click(within(dialog).getByRole('button', { name: 'Copier le lien' }));

    expect(await navigator.clipboard.readText()).toBe(
      `${globalThis.location.origin}/e/soiree-vendredi`
    );
    expect(within(dialog).getByRole('button', { name: 'Lien copié !' })).toBeInTheDocument();
  });

  it('disables leaving while the leave of the viewer is pending', () => {
    const dialog = renderDialog(
      EVENT,
      panel({
        canShowLeave: true,
        isConnectedSelf: true,
        removePending: true,
        pendingRemovalId: 'p-alice',
      }),
      'p-alice'
    );

    expect(within(dialog).getByTestId('leave-event-button')).toBeDisabled();
  });
});
