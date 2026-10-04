import { describe, it, expect } from 'vitest';
import { ApiError } from '@/shared/api/apiError';
import {
  POLL_BACKOFF_MAX_MS,
  type PolledQueryState,
  pollIntervalAfterFailures,
  queryRetryDelay,
  shouldRetryQuery,
} from '@/shared/api/retryPolicy';

const BASE_MS = 3_500;
const NOW = Date.UTC(2026, 8, 23, 12, 0, 0);

type TestQuery = { state: PolledQueryState };

function succeeded(errorUpdateCount = 0): PolledQueryState {
  return {
    status: 'success',
    error: null,
    dataUpdatedAt: NOW - 60_000,
    errorUpdateCount,
    errorUpdatedAt: 0,
  };
}

function failedAgain(
  query: TestQuery,
  overrides: Partial<PolledQueryState> = {}
): PolledQueryState {
  return {
    ...query.state,
    status: 'error',
    error: new ApiError('down', { code: 503 }),
    errorUpdateCount: query.state.errorUpdateCount + 1,
    errorUpdatedAt: NOW + 500,
    ...overrides,
  };
}

describe('shouldRetryQuery', () => {
  it('retries a network failure or a server error once', () => {
    expect(shouldRetryQuery(0, new ApiError('offline', { code: 0 }))).toBe(true);
    expect(shouldRetryQuery(0, new ApiError('down', { code: 503 }))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError('down', { code: 503 }))).toBe(false);
  });

  it('never retries an answer that a second try would repeat', () => {
    expect(shouldRetryQuery(0, new ApiError('missing', { code: 404 }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError('forbidden', { code: 403 }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError('slow down', { code: 429 }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError('not implemented', { code: 501 }))).toBe(false);
  });
});

describe('queryRetryDelay', () => {
  it('waits what the server asked for, within the cap', () => {
    expect(queryRetryDelay(0, new ApiError('down', { code: 503, retryAfterMs: 4_000 }))).toBe(
      4_000
    );
    expect(queryRetryDelay(0, new ApiError('down', { code: 503, retryAfterMs: 600_000 }))).toBe(
      30_000
    );
  });

  it('spreads the retries of many clients around an exponential delay', () => {
    expect(queryRetryDelay(0, new Error('boom'), () => 0)).toBe(500);
    expect(queryRetryDelay(0, new Error('boom'), () => 1)).toBe(1_000);
    expect(queryRetryDelay(2, new Error('boom'), () => 1)).toBe(4_000);
  });
});

describe('pollIntervalAfterFailures', () => {
  it('keeps the live interval while the polls succeed', () => {
    expect(pollIntervalAfterFailures(BASE_MS, { state: succeeded() })).toBe(BASE_MS);
  });

  it('keeps polling off when the page does not poll', () => {
    const query: TestQuery = { state: succeeded() };
    query.state = failedAgain(query);
    expect(pollIntervalAfterFailures(false, query)).toBe(false);
  });

  it('doubles with each consecutive failure since the last success', () => {
    const query: TestQuery = { state: succeeded(4) };
    expect(pollIntervalAfterFailures(BASE_MS, query)).toBe(BASE_MS);

    const delays = [1, 2, 3].map(() => {
      query.state = failedAgain(query);
      return pollIntervalAfterFailures(BASE_MS, query);
    });

    expect(delays).toEqual([7_000, 14_000, 28_000]);
  });

  it('gives the same delay for the same state, so a re-render never restarts the timer', () => {
    const query: TestQuery = { state: succeeded() };
    query.state = failedAgain(query);

    expect(pollIntervalAfterFailures(BASE_MS, query)).toBe(
      pollIntervalAfterFailures(BASE_MS, query)
    );
  });

  it('starts over after a success', () => {
    const query: TestQuery = { state: succeeded() };
    query.state = failedAgain(query);
    query.state = failedAgain(query);
    pollIntervalAfterFailures(BASE_MS, query);
    query.state = { ...query.state, status: 'success', error: null, dataUpdatedAt: NOW };
    pollIntervalAfterFailures(BASE_MS, query);

    query.state = failedAgain(query);

    expect(pollIntervalAfterFailures(BASE_MS, query)).toBe(7_000);
  });

  it('does not count the time a hidden tab spent without polling', () => {
    const query: TestQuery = { state: { ...succeeded(), dataUpdatedAt: NOW - 600_000 } };
    pollIntervalAfterFailures(BASE_MS, query);

    query.state = failedAgain(query);

    expect(pollIntervalAfterFailures(BASE_MS, query)).toBe(7_000);
  });

  it('backs off by failure count when the query never received data', () => {
    const query: TestQuery = {
      state: {
        ...succeeded(),
        status: 'error',
        dataUpdatedAt: 0,
        errorUpdateCount: 3,
        errorUpdatedAt: NOW + 500,
        error: new ApiError('down', { code: 503 }),
      },
    };

    expect(pollIntervalAfterFailures(BASE_MS, query)).toBe(BASE_MS * 8);
  });

  it('never waits more than a minute between two polls', () => {
    const query: TestQuery = { state: succeeded() };
    pollIntervalAfterFailures(BASE_MS, query);
    for (let i = 0; i < 8; i += 1) query.state = failedAgain(query);

    expect(pollIntervalAfterFailures(BASE_MS, query)).toBe(POLL_BACKOFF_MAX_MS);
  });

  it('honours the delay the server asked for', () => {
    const query: TestQuery = { state: succeeded() };
    query.state = failedAgain(query, {
      error: new ApiError('slow down', { code: 429, retryAfterMs: 45_000 }),
    });

    expect(pollIntervalAfterFailures(BASE_MS, query)).toBe(45_000);
  });

  it('stops polling a movie night that no longer exists', () => {
    const query: TestQuery = { state: succeeded() };
    query.state = failedAgain(query, { error: new ApiError('missing', { code: 404 }) });

    expect(pollIntervalAfterFailures(BASE_MS, query)).toBe(false);
  });

  it('spreads the clients that fail at the same time', () => {
    const early: TestQuery = { state: succeeded() };
    const late: TestQuery = { state: succeeded() };
    early.state = failedAgain(early, { errorUpdatedAt: NOW });
    late.state = failedAgain(late, { errorUpdatedAt: NOW + 900 });

    expect(pollIntervalAfterFailures(BASE_MS, early)).toBe(5_250);
    expect(pollIntervalAfterFailures(BASE_MS, late)).toBe(8_400);
  });
});
