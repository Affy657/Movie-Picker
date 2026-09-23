import { ApiError } from '@/shared/api/apiError';

const MAX_QUERY_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;
export const POLL_BACKOFF_MAX_MS = 60_000;

export type PolledQueryState = {
  status: 'pending' | 'error' | 'success';
  error: unknown;
  dataUpdatedAt: number;
  errorUpdateCount: number;
  errorUpdatedAt: number;
};

type PolledQuery = { state: PolledQueryState };

const errorCountAtLastSuccess = new WeakMap<object, number>();

function isGone(error: unknown): boolean {
  return ApiError.is(error) && (error.code === 404 || error.code === 410);
}

function serverRequestedDelayMs(error: unknown): number {
  return ApiError.is(error) ? (error.retryAfterMs ?? 0) : 0;
}

function failureStreak(query: PolledQuery): number {
  const { state } = query;
  if (state.status !== 'error') {
    errorCountAtLastSuccess.set(query, state.errorUpdateCount);
    return 0;
  }
  const origin =
    errorCountAtLastSuccess.get(query) ??
    (state.dataUpdatedAt > 0 ? state.errorUpdateCount - 1 : 0);
  return Math.max(1, state.errorUpdateCount - origin);
}

function jitterFactor(errorUpdatedAt: number): number {
  return 0.75 + ((errorUpdatedAt % 1000) / 1000) * 0.5;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  if (!ApiError.is(error)) return true;
  const code = error.code ?? 0;
  return code === 0 || (code >= 500 && code !== 501);
}

export function queryRetryDelay(
  attempt: number,
  error: unknown,
  random: () => number = Math.random
): number {
  if (ApiError.is(error) && error.retryAfterMs !== undefined) {
    return Math.min(error.retryAfterMs, RETRY_MAX_DELAY_MS);
  }
  const exponential = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  return Math.round(exponential / 2 + (random() * exponential) / 2);
}

export function pollIntervalAfterFailures(
  baseMs: number | false,
  query: PolledQuery
): number | false {
  if (baseMs === false) return false;
  const streak = failureStreak(query);
  if (streak === 0) return baseMs;
  if (isGone(query.state.error)) return false;
  const backoff = Math.min(baseMs * 2 ** streak, POLL_BACKOFF_MAX_MS);
  const jittered = Math.min(
    Math.round(backoff * jitterFactor(query.state.errorUpdatedAt)),
    POLL_BACKOFF_MAX_MS
  );
  return Math.max(baseMs, jittered, serverRequestedDelayMs(query.state.error));
}
