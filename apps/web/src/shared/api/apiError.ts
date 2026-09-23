export const API_ERROR_REASONS = {
  voteLimitReached: 'vote-limit-reached',
  invalidResetToken: 'invalid_reset_token',
  letterboxdWatchlistIncomplete: 'letterboxd_watchlist_incomplete',
  letterboxdSyncUnavailable: 'letterboxd_sync_unavailable',
  letterboxdSyncFailed: 'letterboxd_sync_failed',
} as const;

export class ApiError extends Error {
  readonly code?: number;

  readonly reason?: string;

  readonly retryAfterMs?: number;

  constructor(
    message: string,
    options?: { code?: number; reason?: string; retryAfterMs?: number; cause?: unknown }
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApiError';
    this.code = options?.code;
    this.reason = options?.reason;
    this.retryAfterMs = options?.retryAfterMs;
  }

  static is(e: unknown): e is ApiError {
    return e instanceof ApiError;
  }
}

export function getErrorMessage(e: unknown, fallback = 'Une erreur est survenue.'): string {
  if (ApiError.is(e)) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}
