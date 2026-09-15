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

  it('getEventLivePhase: pending when the lifecycle is pending, even after the slot', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(pendingEvent, t0 + 60_000)).toBe('pending');
  });

  it('event query: slowed poll (upcoming interval) for a pending movie night', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForEventQuery(pendingEvent, t0 + 60_000)).toBe(
      EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS
    );
  });

  it('getEventLivePhase: upcoming before the slot', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(activeEvent, t0 - 60_000)).toBe('upcoming');
  });

  it('getEventLivePhase: active after the slot', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getEventLivePhase(activeEvent, t0 + 1)).toBe('active');
  });

  it('event query : pas de poll sans data ou si isFinished', () => {
    expect(getLivePollingRefetchIntervalForEventQuery(undefined, 0)).toBe(false);
    expect(getLivePollingRefetchIntervalForEventQuery(finishedEvent, 0)).toBe(false);
  });

  it('event query: active poll (short interval) after the slot', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForEventQuery(activeEvent, t0 + 1)).toBe(
      EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS
    );
  });

  it('event query: upcoming poll (long interval) before the slot', () => {
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

  it('movies query: polls when enabled and the movie night is not over (active phase)', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForMoviesQuery(activeEvent, true, t0 + 1)).toBe(
      EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS
    );
  });

  it('movies query: long interval before the slot (consistent with the event detail)', () => {
    const t0 = eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })!;
    expect(getLivePollingRefetchIntervalForMoviesQuery(activeEvent, true, t0 - 1)).toBe(
      EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS
    );
  });

  it('useEventLive exposes the polling strategy, the phase and the movies interval (upcoming in 2030)', () => {
    const { result } = renderHook(() => useEventLive(activeEvent, { moviesQueryEnabled: true }));
    expect(result.current.strategy).toBe('polling');
    expect(result.current.livePhase).toBe('upcoming');
    expect(result.current.moviesRefetchInterval).toBe(EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS);
    expect(result.current.pollIntervalMs).toBe(EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS);
  });
});

describe('useEventLive, crossing the start time', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('forces a re-render at the slot (faster polling afterwards)', () => {
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
