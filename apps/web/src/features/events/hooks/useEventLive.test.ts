import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { EventData } from '@/features/events/types';
import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';
import {
  EVENT_LIVE_POLL_INTERVAL_MS,
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

  it('getEventLivePhase: pending when the lifecycle is pending, even after the slot', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(pendingEvent, t0 + 60_000)).toBe('pending');
  });

  it('getEventLivePhase: upcoming before the slot', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(activeEvent, t0 - 60_000)).toBe('upcoming');
  });

  it('getEventLivePhase: active after the slot', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(activeEvent, t0 + 1)).toBe('active');
  });

  it('polls a night every 15 seconds while the live stream is missing, whatever its phase', () => {
    const upcomingNight = { ...activeEvent, date: '2099-06-01' } as EventData;
    const startedNight = { ...activeEvent, date: '2001-06-01' } as EventData;

    expect(EVENT_LIVE_POLL_INTERVAL_MS).toBe(15_000);
    for (const night of [upcomingNight, startedNight, pendingEvent]) {
      expect(getLivePollingRefetchIntervalForEventQuery(night)).toBe(15_000);
      expect(getLivePollingRefetchIntervalForMoviesQuery(night, true)).toBe(15_000);
    }
  });

  it('event query : pas de poll sans data ou si isFinished', () => {
    expect(getLivePollingRefetchIntervalForEventQuery(undefined)).toBe(false);
    expect(getLivePollingRefetchIntervalForEventQuery(finishedEvent)).toBe(false);
  });

  it('movies query : pas de poll si disabled ou sans event ou isFinished', () => {
    expect(getLivePollingRefetchIntervalForMoviesQuery(activeEvent, false)).toBe(false);
    expect(getLivePollingRefetchIntervalForMoviesQuery(undefined, true)).toBe(false);
    expect(getLivePollingRefetchIntervalForMoviesQuery(finishedEvent, true)).toBe(false);
  });

  it('useEventLive exposes the polling strategy, the phase and the movies interval (upcoming in 2030)', () => {
    const { result } = renderHook(() => useEventLive(activeEvent, { moviesQueryEnabled: true }));
    expect(result.current.strategy).toBe('polling');
    expect(result.current.livePhase).toBe('upcoming');
    expect(result.current.moviesRefetchInterval).toBe(EVENT_LIVE_POLL_INTERVAL_MS);
    expect(result.current.pollIntervalMs).toBe(EVENT_LIVE_POLL_INTERVAL_MS);
  });
});

describe('useEventLive, crossing the start time', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('turns the phase active at the slot, keeping the same polling pace', () => {
    const event = {
      isFinished: false,
      date: '2035-12-01',
      time: '21:00',
    } as EventData;
    const start = eventScheduledStartUtcMs(event)!;
    vi.setSystemTime(start - 5_000);

    const { result } = renderHook(() => useEventLive(event, { moviesQueryEnabled: true }));

    expect(result.current.livePhase).toBe('upcoming');
    expect(result.current.moviesRefetchInterval).toBe(EVENT_LIVE_POLL_INTERVAL_MS);

    act(() => {
      vi.advanceTimersByTime(5_001);
    });

    expect(result.current.livePhase).toBe('active');
    expect(result.current.moviesRefetchInterval).toBe(EVENT_LIVE_POLL_INTERVAL_MS);
  });
});
