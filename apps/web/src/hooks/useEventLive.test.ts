import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { EventData } from '../types/event';
import {
  EVENT_LIVE_POLL_INTERVAL_MS,
  getLivePollingRefetchIntervalForEventQuery,
  getLivePollingRefetchIntervalForMoviesQuery,
  useEventLive,
} from './useEventLive';

const activeEvent = { terminé: false } as EventData;
const finishedEvent = { terminé: true } as EventData;

describe('useEventLive / polling helpers', () => {
  it('EVENT_LIVE_POLL_INTERVAL_MS est défini', () => {
    expect(EVENT_LIVE_POLL_INTERVAL_MS).toBe(5000);
  });

  it('event query : pas de poll sans data ou si terminé', () => {
    expect(getLivePollingRefetchIntervalForEventQuery(undefined)).toBe(false);
    expect(getLivePollingRefetchIntervalForEventQuery(finishedEvent)).toBe(false);
  });

  it('event query : poll si actif', () => {
    expect(getLivePollingRefetchIntervalForEventQuery(activeEvent)).toBe(
      EVENT_LIVE_POLL_INTERVAL_MS
    );
  });

  it('movies query : pas de poll si disabled ou sans event ou terminé', () => {
    expect(getLivePollingRefetchIntervalForMoviesQuery(undefined, false)).toBe(false);
    expect(getLivePollingRefetchIntervalForMoviesQuery(undefined, true)).toBe(false);
    expect(getLivePollingRefetchIntervalForMoviesQuery(finishedEvent, true)).toBe(false);
  });

  it('movies query : poll si enabled et soirée non terminée', () => {
    expect(getLivePollingRefetchIntervalForMoviesQuery(activeEvent, true)).toBe(
      EVENT_LIVE_POLL_INTERVAL_MS
    );
  });

  it('useEventLive expose strategy polling et interval films', () => {
    const { result } = renderHook(() => useEventLive(activeEvent, { moviesQueryEnabled: true }));
    expect(result.current.strategy).toBe('polling');
    expect(result.current.pollIntervalMs).toBe(EVENT_LIVE_POLL_INTERVAL_MS);
    expect(result.current.moviesRefetchInterval).toBe(EVENT_LIVE_POLL_INTERVAL_MS);
  });
});
