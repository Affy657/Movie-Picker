import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { EventData } from '@/features/events/types';
import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';
import {
  EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS,
  EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS,
  getEventLivePhase,
  getLivePollingRefetchIntervalForEventQuery,
  getLivePollingRefetchIntervalForMoviesQuery,
  useEventLive,
} from '@/features/events/hooks/useEventLive';

const activeEvent = {
  isFinished: false,
  date: '2030-06-01',
  time: '20:00',
} as EventData;

const finishedEvent = { isFinished: true, date: '2030-06-01', time: '20:00' } as EventData;

const pendingEvent = {
  isFinished: false,
  lifecycle: 'pending',
  date: '2030-06-01',
  time: '20:00',
} as EventData;

describe('useEventLive / polling helpers', () => {
  it('getEventLivePhase : finished si isFinished', () => {
    expect(getEventLivePhase(finishedEvent, 0)).toBe('finished');
  });

  it('getEventLivePhase : pending si lifecycle pending, même après le créneau', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(pendingEvent, t0 + 60_000)).toBe('pending');
  });

  it('event query : poll ralenti (intervalle upcoming) pour une soirée en suspens', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForEventQuery(pendingEvent, t0 + 60_000)).toBe(
      EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS
    );
  });

  it('getEventLivePhase : upcoming avant le créneau', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(activeEvent, t0 - 60_000)).toBe('upcoming');
  });

  it('getEventLivePhase : active après le créneau', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(activeEvent, t0 + 1)).toBe('active');
  });

  it('event query : pas de poll sans data ou si isFinished', () => {
    expect(getLivePollingRefetchIntervalForEventQuery(undefined, 0)).toBe(false);
    expect(getLivePollingRefetchIntervalForEventQuery(finishedEvent, 0)).toBe(false);
  });

  it('event query : poll actif (intervalle court) après le créneau', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForEventQuery(activeEvent, t0 + 1)).toBe(
      EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS
    );
  });

  it('event query : poll upcoming (intervalle long) avant le créneau', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForEventQuery(activeEvent, t0 - 1)).toBe(
      EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS
    );
  });

  it('movies query : pas de poll si disabled ou sans event ou isFinished', () => {
    expect(getLivePollingRefetchIntervalForMoviesQuery(undefined, false, 0)).toBe(false);
    expect(getLivePollingRefetchIntervalForMoviesQuery(undefined, true, 0)).toBe(false);
    expect(getLivePollingRefetchIntervalForMoviesQuery(finishedEvent, true, 0)).toBe(false);
  });

  it('movies query : poll si enabled et soirée non terminée (phase active)', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForMoviesQuery(activeEvent, true, t0 + 1)).toBe(
      EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS
    );
  });

  it('movies query : intervalle long avant le créneau (cohérent avec le détail event)', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForMoviesQuery(activeEvent, true, t0 - 1)).toBe(
      EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS
    );
  });

  it('useEventLive expose strategy polling, phase et interval films (à venir en 2030)', () => {
    const { result } = renderHook(() => useEventLive(activeEvent, { moviesQueryEnabled: true }));
    expect(result.current.strategy).toBe('polling');
    expect(result.current.livePhase).toBe('upcoming');
    expect(result.current.moviesRefetchInterval).toBe(EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS);
    expect(result.current.pollIntervalMs).toBe(EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS);
  });
});

describe('useEventLive — passage à l’heure de début', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('force un re-render au moment du créneau (polling plus rapide ensuite)', () => {
    const event = {
      isFinished: false,
      date: '2035-12-01',
      time: '21:00',
    } as EventData;
    const start = eventScheduledStartUtcMs(event)!;
    vi.setSystemTime(start - 5_000);

    const { result } = renderHook(() => useEventLive(event, { moviesQueryEnabled: true }));

    expect(result.current.livePhase).toBe('upcoming');
    expect(result.current.moviesRefetchInterval).toBe(EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS);

    act(() => {
      vi.advanceTimersByTime(5_001);
    });

    expect(result.current.livePhase).toBe('active');
    expect(result.current.moviesRefetchInterval).toBe(EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS);
  });
});
