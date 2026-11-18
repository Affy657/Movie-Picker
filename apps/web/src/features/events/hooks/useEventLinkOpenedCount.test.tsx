import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEventLinkOpenedCount } from '@/features/events/hooks/useEventLinkOpenedCount';
import type { EventData } from '@/features/events/types';

const { track, auth } = vi.hoisted(() => ({
  track: vi.fn(),
  auth: { user: null as { userId: string } | null, isLoading: false },
}));
vi.mock('@/shared/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track }) }));
vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth: () => auth }));

function night(overrides: Partial<EventData> = {}): EventData {
  return {
    _id: 'e1',
    slug: 'soiree',
    title: 'Soirée',
    date: '2026-12-01',
    time: '20:00',
    isHost: false,
    isFinished: false,
    myParticipant: null,
    ...overrides,
  } as EventData;
}

const ONCE = { oncePerTab: 'event_link_opened:soiree' };

describe('useEventLinkOpenedCount', () => {
  beforeEach(() => {
    track.mockReset();
    auth.user = null;
    auth.isLoading = false;
  });

  it('counts a visitor without account opening an open night', () => {
    renderHook(() =>
      useEventLinkOpenedCount({ slug: 'soiree', event: night(), participant: null, isFull: false })
    );

    expect(track).toHaveBeenCalledExactlyOnceWith(
      'event_link_opened',
      { viewer: 'visitor', state: 'open' },
      ONCE
    );
  });

  it('counts a signed-in account that is not part of the night yet', () => {
    auth.user = { userId: 'u1' };

    renderHook(() =>
      useEventLinkOpenedCount({ slug: 'soiree', event: night(), participant: null, isFull: true })
    );

    expect(track).toHaveBeenCalledExactlyOnceWith(
      'event_link_opened',
      { viewer: 'account', state: 'full' },
      ONCE
    );
  });

  it('counts the opening of a night that is over', () => {
    renderHook(() =>
      useEventLinkOpenedCount({
        slug: 'soiree',
        event: night({ isFinished: true }),
        participant: null,
        isFull: false,
      })
    );

    expect(track).toHaveBeenCalledExactlyOnceWith(
      'event_link_opened',
      { viewer: 'visitor', state: 'closed' },
      ONCE
    );
  });

  it('waits for the session check before telling a visitor from an account', () => {
    auth.isLoading = true;
    const { rerender } = renderHook(() =>
      useEventLinkOpenedCount({ slug: 'soiree', event: night(), participant: null, isFull: false })
    );
    expect(track).not.toHaveBeenCalled();

    auth.isLoading = false;
    auth.user = { userId: 'u1' };
    rerender();

    expect(track).toHaveBeenCalledExactlyOnceWith(
      'event_link_opened',
      { viewer: 'account', state: 'open' },
      ONCE
    );
  });

  it.each([
    ['the host', { isHost: true }, null],
    ['a participant known to the server', { myParticipant: { id: 'p1', pseudo: 'Léa' } }, null],
    ['a participant remembered on this device', {}, { participantId: 'p1', pseudo: 'Léa' }],
  ])('leaves out %s, who is no newcomer', (_who, overrides, participant) => {
    renderHook(() =>
      useEventLinkOpenedCount({
        slug: 'soiree',
        event: night(overrides),
        participant,
        isFull: false,
      })
    );

    expect(track).not.toHaveBeenCalled();
  });
});
